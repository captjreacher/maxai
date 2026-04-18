<?php
/**
 * Plugin Name: MAXAI MU Loader
 * Description: Single bootstrap file for Maximised AI must-use modules.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

if (defined('MAXAI_MU_LOADER_BOOTSTRAPPED')) {
    return;
}

define('MAXAI_MU_LOADER_BOOTSTRAPPED', true);

$mu_dir = __DIR__ . '/mu-plugins';

if (!is_dir($mu_dir)) {
    return;
}

$modules = [
    'mu-maxai-chat.php',
    'maxai-chat-loader.php',
    'maxai-contact-to-notion.php',
    'maxai-listener.php',
    'maxai-wire-contact.php',
    'mu-maxai-backtotop.php',
    'mu-maxai-diag.php',
];

foreach ($modules as $module) {
    $module_path = $mu_dir . '/' . $module;

    if (file_exists($module_path)) {
        require_once $module_path;
    }
}
