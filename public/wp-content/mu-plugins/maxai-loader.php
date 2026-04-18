<?php
/**
 * Plugin Name: MAXAI MU Loader
 * Description: Single bootstrap file for Maximised AI must-use modules.
 * Version: 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('MAXAI_MU_BOOTSTRAPPED')) {
    return;
}

define('MAXAI_MU_BOOTSTRAPPED', true);
define('MAXAI_MU_VERSION', '2.0.0');
define('MAXAI_MU_DIR', __DIR__);
define('MAXAI_MU_URL', content_url('mu-plugins'));
define('MAXAI_MU_SUPPORT_DIR', MAXAI_MU_DIR . '/maxai');
define('MAXAI_MU_SUPPORT_URL', trailingslashit(MAXAI_MU_URL) . 'maxai');

require_once MAXAI_MU_SUPPORT_DIR . '/maxai-chat-api.php';

function maxai_get_setting($key, $fallback = null) {
    if (defined($key) && constant($key) !== '') {
        return constant($key);
    }

    $env = getenv($key);
    if ($env !== false && $env !== '') {
        return $env;
    }

    $option = get_option(strtolower($key));
    if ($option !== false && $option !== '' && $option !== null) {
        return $option;
    }

    return $fallback;
}

function maxai_get_chat_icon_url() {
    $theme_locations = [
        [get_stylesheet_directory(), get_stylesheet_directory_uri()],
        [get_template_directory(), get_template_directory_uri()],
    ];

    foreach ($theme_locations as $location) {
        $icon_path = trailingslashit($location[0]) . 'assets/chat-icon.webp';

        if (file_exists($icon_path)) {
            return trailingslashit($location[1]) . 'assets/chat-icon.webp?v=' . filemtime($icon_path);
        }
    }

    return '';
}

function maxai_enqueue_chat_assets() {
    if (is_admin()) {
        return;
    }

    $handle = 'maxai-chat';
    $script_path = MAXAI_MU_SUPPORT_DIR . '/maxai-chat.js';

    if (!file_exists($script_path)) {
        return;
    }

    wp_register_script(
        $handle,
        MAXAI_MU_SUPPORT_URL . '/maxai-chat.js',
        [],
        (string) filemtime($script_path),
        true
    );

    wp_localize_script($handle, 'MAXAI_CHAT_CONFIG', [
        'restUrl' => esc_url_raw(rest_url('maxai/v1/chat')),
        'restNonce' => wp_create_nonce('wp_rest'),
        'iconUrl' => maxai_get_chat_icon_url(),
        'contactUrl' => esc_url_raw(home_url('/contact-us/')),
        'greeting' => 'Hello! How can I help you today?',
    ]);

    wp_enqueue_script($handle);
}
add_action('wp_enqueue_scripts', 'maxai_enqueue_chat_assets');

$optional_modules = [
    'maxai-contact-to-notion.php',
    'maxai-listener.php',
    'maxai-wire-contact.php',
    'mu-maxai-backtotop.php',
    'mu-maxai-diag.php',
];

foreach ($optional_modules as $module) {
    $module_path = MAXAI_MU_SUPPORT_DIR . '/' . $module;

    if (file_exists($module_path)) {
        require_once $module_path;
    }
}
