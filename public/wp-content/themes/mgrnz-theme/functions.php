<?php
add_action('after_setup_theme', function () {
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
});

add_action('wp_enqueue_scripts', function () {
  $uri = get_stylesheet_directory_uri();
  if (file_exists(get_stylesheet_directory() . '/assets/css/main.css')) {
    wp_enqueue_style('mgrnz-main', $uri . '/assets/css/main.css', [], null);
  }
  if (file_exists(get_stylesheet_directory() . '/assets/css/custom.css')) {
    wp_enqueue_style('mgrnz-custom', $uri . '/assets/css/custom.css', ['mgrnz-main'], null);
  }
});

add_action('rest_api_init', function () {
  remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
  add_filter('rest_pre_serve_request', function ($value) {
    $allowed = [
      'https://mgrnz.com',
      'https://www.mgrnz.com',
      'https://jqfodlzcsgfocyuwazyx.functions.supabase.co'
    ];
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (in_array($origin, $allowed, true)) {
      header('Access-Control-Allow-Origin: ' . $origin);
      header('Vary: Origin');
      header('Access-Control-Allow-Credentials: true');
      header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
      header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, X-Requested-With');
      header('Access-Control-Max-Age: 600');
    }
    if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
      status_header(200);
      exit;
    }
    return $value;
  }, 15);
});

add_filter('acf/rest_api/field_settings/show_in_rest', '__return_true');
