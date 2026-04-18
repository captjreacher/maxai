<?php
/**
 * Plugin Name: MAXAI Diagnostics (MU)
 * Description: /maxai/v1/env, /maxai/v1/opcache-reset (auth), and /maxai/v1/diag-status (open).
 * Version: 1.0.2
 */
namespace MaxAI\MU\Diag;
if (!defined('ABSPATH')) exit;

/** env helper */
function env($k,$d=''){ $v=getenv($k); return ($v!==false && $v!=='')?$v:$d; }

/** get secret key (from define or env) */
function get_key(){
  if (defined('MAXAI_OPCACHE_KEY') && MAXAI_OPCACHE_KEY) return trim((string)MAXAI_OPCACHE_KEY);
  return trim((string)env('MAXAI_OPCACHE_KEY',''));
}

/** permission: admin OR matching key via header or query */
function check_auth(\WP_REST_Request $req){
  if (current_user_can('manage_options')) return true;

  $candidates = [
    $req->get_header('x-maxai-diag'),
    $req->get_header('x-opcache-key'),
    $req->get_param('diag_key'),
    $req->get_param('key'),
  ];
  $provided = '';
  foreach ($candidates as $cand) {
    if ($cand !== null && $cand !== '') { $provided = trim((string)$cand); break; }
  }
  $expected = get_key();
  return ($provided !== '' && $expected !== '' && hash_equals($expected, $provided));
}

add_action('rest_api_init', function(){

  // OPEN: diag-status (to debug key presence safely; returns lengths only)
  register_rest_route('maxai/v1','/diag-status',[
    'methods'  => 'GET',
    'permission_callback' => '__return_true',
    'callback' => function(\WP_REST_Request $req){
      $candidates = [
        $req->get_header('x-maxai-diag'),
        $req->get_header('x-opcache-key'),
        $req->get_param('diag_key'),
        $req->get_param('key'),
      ];
      $provided = '';
      foreach ($candidates as $cand) {
        if ($cand !== null && $cand !== '') { $provided = trim((string)$cand); break; }
      }
      $expected = get_key();
      return new \WP_REST_Response([
        'has_define'   => (defined('MAXAI_OPCACHE_KEY') && MAXAI_OPCACHE_KEY!==''),
        'expected_len' => strlen($expected),
        'provided_len' => strlen($provided),
        'ts'           => gmdate('c'),
      ], 200);
    }
  ]);

  // AUTH: env
  register_rest_route('maxai/v1','/env',[
    'methods'  => 'GET',
    'permission_callback' => __NAMESPACE__.'\check_auth',
    'callback' => function(){
      $routes = array_keys(\rest_get_server()->get_routes());
      $data = [
        'php'           => PHP_VERSION,
        'wp'            => get_bloginfo('version'),
        'theme'         => wp_get_theme()->get('Name').' '.wp_get_theme()->get('Version'),
        'mu_plugins'    => array_values(array_map('basename',(array)glob(WPMU_PLUGIN_DIR.'/*.php'))),
        'routes_loaded' => $routes,
        'ts'            => gmdate('c'),
      ];
      return new \WP_REST_Response($data,200);
    }
  ]);

  // AUTH: opcache-reset
  register_rest_route('maxai/v1','/opcache-reset',[
    'methods'  => 'GET',
    'permission_callback' => __NAMESPACE__.'\check_auth',
    'callback' => function(){
      if (!function_exists('opcache_reset')) {
        return new \WP_REST_Response(['ok'=>false,'detail'=>'OPcache not available'],501);
      }
      $ok = opcache_reset();
      return new \WP_REST_Response(['ok'=>$ok,'ts'=>gmdate('c')], $ok?200:500);
    }
  ]);

});
