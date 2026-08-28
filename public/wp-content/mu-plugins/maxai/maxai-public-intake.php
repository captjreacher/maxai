<?php
/**
 * Plugin Name: MAXAI – Cockpit Public Intake (MU)
 * Description: Proxies public MaximisedAI contact and signup submissions to the canonical Cockpit/Supabase intake Edge Function.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

function maxai_public_intake_url() {
    return 'https://jqfodlzcsgfocyuawzyx.supabase.co/functions/v1/maxai-public-intake';
}

add_filter('rest_pre_serve_request', function($served, $result, $request){
    if (!($request instanceof WP_REST_Request)) return $served;
    if ($request->get_route() !== '/maxai/v1/contact') return $served;
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
    }
    return $served;
}, 10, 3);

add_action('rest_api_init', function () {
    register_rest_route('maxai/v1', '/contact', [
        'methods' => 'POST',
        'callback' => 'maxai_public_intake_proxy',
        'permission_callback' => '__return_true',
    ]);
});

function maxai_public_intake_proxy(WP_REST_Request $req) {
    $in = $req->get_json_params();
    if (!is_array($in)) $in = [];

    $intent = isset($in['intent']) && $in['intent'] === 'signup' ? 'signup' : 'general_enquiry';
    $name = sanitize_text_field(isset($in['name']) ? $in['name'] : '');
    $email = sanitize_email(isset($in['email']) ? $in['email'] : '');
    $organisation = sanitize_text_field(isset($in['organisation']) ? $in['organisation'] : (isset($in['company']) ? $in['company'] : ''));
    $message = trim(wp_strip_all_tags(isset($in['message']) ? $in['message'] : ''));
    $source_page = sanitize_text_field(isset($in['source_page']) ? $in['source_page'] : wp_parse_url(isset($in['page_url']) ? $in['page_url'] : home_url('/'), PHP_URL_PATH));
    $referrer = esc_url_raw(isset($in['referrer']) ? $in['referrer'] : '');
    $website = sanitize_text_field(isset($in['website']) ? $in['website'] : (isset($in['company_website']) ? $in['company_website'] : ''));

    if (!$email || !is_email($email)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'Please enter a valid email address.'], 400);
    }

    if ($intent === 'general_enquiry' && mb_strlen($message) < 12) {
        return new WP_REST_Response(['ok' => false, 'error' => 'Please include a message.'], 400);
    }

    $payload = [
        'intent' => $intent,
        'name' => $name ?: null,
        'email' => strtolower($email),
        'organisation' => $organisation ?: null,
        'message' => $message ?: null,
        'marketing_consent' => $intent === 'signup' ? true : !empty($in['marketing_consent']),
        'source' => 'maximisedai.com',
        'source_page' => $source_page ?: '/',
        'referrer' => $referrer ?: null,
        'website' => $website,
    ];

    $response = wp_remote_post(maxai_public_intake_url(), [
        'headers' => [
            'Content-Type' => 'application/json',
            'Origin' => home_url(),
        ],
        'body' => wp_json_encode($payload),
        'timeout' => 20,
        'data_format' => 'body',
    ]);

    if (is_wp_error($response)) {
        error_log('[MAXAI INTAKE] Edge Function request failed: ' . $response->get_error_message());
        return new WP_REST_Response(['ok' => false, 'error' => 'Unable to submit right now. Please try again.'], 502);
    }

    $status = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status < 200 || $status >= 300 || empty($body['ok'])) {
        error_log('[MAXAI INTAKE] Edge Function returned status ' . $status);
        return new WP_REST_Response(['ok' => false, 'error' => 'Unable to submit right now. Please try again.'], $status >= 400 ? $status : 502);
    }

    return new WP_REST_Response(['ok' => true, 'received' => true], 200);
}
