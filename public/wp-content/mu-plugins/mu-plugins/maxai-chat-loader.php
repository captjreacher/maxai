<?php
/**
 * Internal MAXAI chat widget bootstrap.
 *
 * Loaded by wp-content/mu-plugins/maxai-loader.php.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('MAXAI_CHAT_WIDGET_BOOTSTRAPPED')) {
    return;
}

define('MAXAI_CHAT_WIDGET_BOOTSTRAPPED', true);

function maxai_enqueue_chat_widget_assets() {
    $handle = 'maxai-chat';
    $js_path = plugin_dir_path(__FILE__) . 'maxai-chat.js';
    $js_url = plugin_dir_url(__FILE__) . 'maxai-chat.js';

    if (!file_exists($js_path)) {
        return;
    }

    $icon_url = '';
    $theme_locations = [
        [get_stylesheet_directory(), get_stylesheet_directory_uri()],
        [get_template_directory(), get_template_directory_uri()],
    ];

    foreach ($theme_locations as [$dir, $uri]) {
        $icon_path = trailingslashit($dir) . 'assets/chat-icon.webp';

        if (file_exists($icon_path)) {
            $icon_url = trailingslashit($uri) . 'assets/chat-icon.webp?v=' . filemtime($icon_path);
            break;
        }
    }

    if (!$icon_url) {
        $icon_url = trailingslashit(get_stylesheet_directory_uri()) . 'assets/chat-icon.webp';
    }

    wp_register_script($handle, $js_url, [], filemtime($js_path), true);
    wp_localize_script($handle, 'MAXAI_CHAT_CONFIG', [
        'ICON_URL' => $icon_url,
        'AJAX_URL' => admin_url('admin-ajax.php'),
    ]);
    wp_enqueue_script($handle);
}

add_action('wp_enqueue_scripts', 'maxai_enqueue_chat_widget_assets');
