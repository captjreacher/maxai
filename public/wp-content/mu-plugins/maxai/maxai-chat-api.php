<?php
/**
 * MAXAI chat REST endpoint.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('MAXAI_CHAT_API_BOOTSTRAPPED')) {
    return;
}

define('MAXAI_CHAT_API_BOOTSTRAPPED', true);

add_action('rest_api_init', 'maxai_register_chat_route');

function maxai_register_chat_route() {
    register_rest_route('maxai/v1', '/chat', [
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'maxai_handle_chat_rest',
        'permission_callback' => '__return_true',
    ]);
}

function maxai_handle_chat_rest(WP_REST_Request $request) {
    $request_id = wp_generate_uuid4();
    $params = $request->get_json_params();

    if (!is_array($params)) {
        return maxai_chat_error_response(
            'invalid_json',
            'Request body must be valid JSON.',
            400,
            $request_id
        );
    }

    $message = '';
    if (isset($params['message'])) {
        $message = maxai_normalize_chat_message($params['message']);
    }

    if ($message === '') {
        return maxai_chat_error_response(
            'missing_message',
            'Message is required.',
            400,
            $request_id
        );
    }

    if (mb_strlen($message) > 2000) {
        return maxai_chat_error_response(
            'message_too_long',
            'Message must be 2000 characters or fewer.',
            400,
            $request_id
        );
    }

    $previous_response_id = '';
    if (!empty($params['previous_response_id']) && is_string($params['previous_response_id'])) {
        $candidate = sanitize_text_field(wp_unslash($params['previous_response_id']));
        if (preg_match('/^resp_[A-Za-z0-9]+$/', $candidate)) {
            $previous_response_id = $candidate;
        }
    }

    $api_key = maxai_get_setting('OPENAI_API_KEY');
    if (!$api_key) {
        maxai_log_chat_error($request_id, 'missing_api_key');

        return maxai_chat_error_response(
            'configuration_error',
            'Chat is not configured correctly.',
            500,
            $request_id
        );
    }

    $payload = maxai_build_openai_payload($message, $previous_response_id);
    $openai_response = maxai_openai_request($payload, $request_id, $api_key);

    if (is_wp_error($openai_response)) {
        maxai_log_chat_error($request_id, 'transport_error', [
            'detail' => $openai_response->get_error_message(),
        ]);

        return maxai_chat_error_response(
            'upstream_unreachable',
            'The assistant is temporarily unavailable.',
            502,
            $request_id
        );
    }

    $status_code = wp_remote_retrieve_response_code($openai_response);
    $body = wp_remote_retrieve_body($openai_response);
    $json = json_decode($body, true);

    if ($status_code < 200 || $status_code >= 300) {
        $detail = 'Unexpected upstream response.';
        if (is_array($json) && !empty($json['error']['message'])) {
            $detail = $json['error']['message'];
        } elseif (is_string($body) && $body !== '') {
            $detail = mb_substr($body, 0, 600);
        }

        maxai_log_chat_error($request_id, 'openai_http_error', [
            'status' => $status_code,
            'detail' => $detail,
        ]);

        return maxai_chat_error_response(
            'openai_http_error',
            'The assistant request failed upstream.',
            502,
            $request_id
        );
    }

    if (!is_array($json)) {
        maxai_log_chat_error($request_id, 'invalid_openai_json');

        return maxai_chat_error_response(
            'invalid_upstream_payload',
            'The assistant returned an unreadable response.',
            502,
            $request_id
        );
    }

    $reply = maxai_extract_openai_reply($json);
    if ($reply === '') {
        maxai_log_chat_error($request_id, 'empty_reply', [
            'response_id' => isset($json['id']) ? $json['id'] : '',
            'status' => isset($json['status']) ? $json['status'] : '',
        ]);

        return maxai_chat_error_response(
            'empty_reply',
            'The assistant did not return a message.',
            502,
            $request_id
        );
    }

    return maxai_chat_success_response([
        'ok' => true,
        'reply' => $reply,
        'response_id' => isset($json['id']) ? $json['id'] : '',
        'request_id' => $request_id,
        'model' => isset($json['model']) ? $json['model'] : '',
    ], 200, $request_id);
}

function maxai_normalize_chat_message($value) {
    if (!is_string($value)) {
        return '';
    }

    $message = wp_unslash($value);
    $message = str_replace(["\r\n", "\r"], "\n", $message);
    $message = sanitize_textarea_field($message);

    return trim($message);
}

function maxai_build_openai_payload($message, $previous_response_id) {
    $payload = [
        'model' => (string) maxai_get_setting('MAXAI_OPENAI_MODEL', 'gpt-4.1-mini'),
        'instructions' => (string) maxai_get_setting(
            'MAXAI_CHAT_INSTRUCTIONS',
            'You are the Maximised AI assistant. Answer using the knowledge base when relevant. If the answer is not in the knowledge base, say so clearly instead of guessing.'
        ),
        'input' => $message,
        'temperature' => 0.2,
        'tool_choice' => 'auto',
        'store' => true,
        'text' => [
            'format' => [
                'type' => 'text',
            ],
        ],
    ];

    if ($previous_response_id !== '') {
        $payload['previous_response_id'] = $previous_response_id;
    }

    $vector_store_id = maxai_get_setting('MAXAI_VECTOR_STORE_ID');
    if ($vector_store_id) {
        $payload['tools'] = [[
            'type' => 'file_search',
            'vector_store_ids' => [(string) $vector_store_id],
            'max_num_results' => 6,
        ]];
    }

    return $payload;
}

function maxai_openai_request($payload, $request_id, $api_key) {
    $args = [
        'headers' => [
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'X-MaxAI-Request-Id' => $request_id,
        ],
        'body' => wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'timeout' => 45,
        'data_format' => 'body',
    ];

    return wp_remote_post('https://api.openai.com/v1/responses', $args);
}

function maxai_extract_openai_reply($json) {
    if (!empty($json['output_text']) && is_string($json['output_text'])) {
        return trim($json['output_text']);
    }

    $chunks = [];

    if (empty($json['output']) || !is_array($json['output'])) {
        return '';
    }

    foreach ($json['output'] as $item) {
        if (!is_array($item) || ($item['type'] ?? '') !== 'message') {
            continue;
        }

        if (($item['role'] ?? '') !== 'assistant' || empty($item['content']) || !is_array($item['content'])) {
            continue;
        }

        foreach ($item['content'] as $content_item) {
            if (!is_array($content_item)) {
                continue;
            }

            if (($content_item['type'] ?? '') === 'output_text' && !empty($content_item['text'])) {
                $chunks[] = $content_item['text'];
                continue;
            }

            if (($content_item['type'] ?? '') === 'text' && !empty($content_item['text'])) {
                $chunks[] = $content_item['text'];
            }
        }
    }

    return trim(implode("\n", $chunks));
}

function maxai_chat_success_response($data, $status, $request_id) {
    $response = new WP_REST_Response($data, $status);
    $response->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    $response->header('Pragma', 'no-cache');
    $response->header('X-MaxAI-Request-Id', $request_id);

    return $response;
}

function maxai_chat_error_response($code, $message, $status, $request_id) {
    return maxai_chat_success_response([
        'ok' => false,
        'error' => [
            'code' => $code,
            'message' => $message,
        ],
        'request_id' => $request_id,
    ], $status, $request_id);
}

function maxai_log_chat_error($request_id, $code, $context = []) {
    if (!is_array($context)) {
        $context = [];
    }

    $suffix = $context ? ' ' . wp_json_encode($context) : '';
    error_log('[MAXAI_CHAT][' . $request_id . '] ' . $code . $suffix);
}
