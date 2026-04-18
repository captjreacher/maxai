<?php
/**
 * Plugin Name: MAXAI – Contact to Notion (MU)
 * Description: Posts Contact Us JSON to Notion. Uses your schema keys (name, lastname, email, phone, company, consent, message, page_url, source, received_at). PHP 7.x compatible.
 * Version: 1.4.4
 */
if (!defined('ABSPATH')) exit;

/* -------- helpers -------- */
function maxai_cfg($k,$d=null){
  if (defined($k) && constant($k)) return constant($k);
  $e = getenv($k); if ($e) return $e;
  $o = get_option(strtolower($k)); return $o ? $o : $d;
}
function maxai_contacts_db_id(){
  $db = maxai_cfg('MAXAI_DB_CONTACTS');
  if (!$db) $db = maxai_cfg('NOTION_DB_CONTACTS');
  if (!$db) $db = maxai_cfg('NOTION_DATABASE_ID');
  return $db;
}

/* -------- headers -------- */
add_action('rest_pre_serve_request', function($served){
  if (!headers_sent()){
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-MAXAI-TOKEN');
    header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
  }
  return $served;
}, 10);

/* -------- routes -------- */
add_action('rest_api_init', function () {
  register_rest_route('maxai/v1','/contact',[
    'methods'=>'POST','callback'=>'maxai_contact_to_notion','permission_callback'=>'__return_true',
  ]);
});

/* -------- Notion builders (PHP 7.x safe) -------- */
function maxai_n_title($t){ return array('title'=>array(array('text'=>array('content'=>mb_substr($t,0,200))))); }
function maxai_n_text($t){  return array('rich_text'=>array(array('text'=>array('content'=>mb_substr($t,0,2000))))); }
function maxai_n_email($s){ return array('email'=>$s); }
function maxai_n_phone($s){ return array('phone_number'=>$s); }
function maxai_n_check($b){ return array('checkbox'=> (bool)$b); }
function maxai_n_date($iso){ return array('date'=>array('start'=>$iso)); }
function maxai_n_url($s){   return array('url'=>$s); }
function maxai_n_select($n){return array('select'=>array('name'=>$n)); }
function maxai_n_status($n){return array('status'=>array('name'=>$n)); }

/* -------- Discover DB props; then hard fallback to your schema -------- */
function maxai_discover_notion_props($token,$db,$force=false){
  $ck = 'maxai_notion_props_'.$db;
  if (!$force){ $c = get_transient($ck); if (is_array($c)) return $c; }

  $map = array();
  $h = array('Authorization'=>'Bearer '.$token,'Notion-Version'=>'2022-06-28');
  $r = wp_remote_get('https://api.notion.com/v1/databases/'.$db, array('headers'=>$h,'timeout'=>15));
  if (!is_wp_error($r)){
    $j = json_decode(wp_remote_retrieve_body($r), true);
    if (!empty($j['properties']) && is_array($j['properties'])){
      foreach ($j['properties'] as $name=>$def){
        $type = isset($def['type']) ? $def['type'] : '';
        $ln = strtolower($name);
        if ($type==='title')                   $map['title']       = array('name'=>$name,'type'=>$type);
        if ($ln==='lastname')                  $map['lastname']    = array('name'=>$name,'type'=>$type);
        if ($type==='email')                   $map['email']       = array('name'=>$name,'type'=>$type);
        if ($type==='phone_number')            $map['phone']       = array('name'=>$name,'type'=>$type);
        if ($type==='url')                     $map['page_url']    = array('name'=>$name,'type'=>$type);
        if ($type==='checkbox')                $map['consent']     = array('name'=>$name,'type'=>$type);
// Only set received_at if Notion says it's a Date column
if (!empty($real['received_at']['name']) && $real['received_at']['type'] === 'date') {
  $props[$real['received_at']['name']] = maxai_n_date($now);
}

        if ($type==='rich_text'){
          if (empty($map['company']) && (strpos($ln,'company')!==false || strpos($ln,'org')!==false)) $map['company'] = array('name'=>$name,'type'=>$type);
          if (empty($map['message']) && (strpos($ln,'message')!==false || strpos($ln,'notes')!==false || strpos($ln,'detail')!==false)) $map['message'] = array('name'=>$name,'type'=>$type);
          if (empty($map['source'])  && strpos($ln,'source')!==false) $map['source'] = array('name'=>$name,'type'=>$type);
        }
        if (($type==='status' || $type==='select') && empty($map['status'])) $map['status'] = array('name'=>$name,'type'=>$type);
      }
    }
  }

  // hard fallback: your exact schema
  $fallback = array(
    'title'       => array('name'=>'name',       'type'=>'title'),
    'lastname'    => array('name'=>'lastname',   'type'=>'rich_text'),
    'email'       => array('name'=>'email',      'type'=>'email'),
    'phone'       => array('name'=>'phone',      'type'=>'phone_number'),
    'company'     => array('name'=>'company',    'type'=>'rich_text'),
    'message'     => array('name'=>'message',    'type'=>'rich_text'),
    'page_url'    => array('name'=>'page_url',   'type'=>'url'),
    'source'      => array('name'=>'source',     'type'=>'rich_text'),
    'consent'     => array('name'=>'consent',    'type'=>'checkbox'),
    'received_at' => array('name'=>'received_at','type'=>'date'),
    'status'      => array('name'=>null,'type'=>null),
  );
  foreach ($fallback as $k=>$v){ if (empty($map[$k]['name'])) $map[$k] = $v; }

  set_transient($ck,$map,DAY_IN_SECONDS);
  return $map;
}

/* -------- handler -------- */
function maxai_contact_to_notion(WP_REST_Request $req){
  ob_start();

  $token = maxai_cfg('NOTION_API_KEY'); 
  $db    = maxai_contacts_db_id();
  if (!$token || !$db){
    ob_end_clean(); return new WP_REST_Response(['ok'=>false,'error'=>'notion_config_missing'],500);
  }

  $in = $req->get_json_params(); if (!is_array($in)) $in = array();

  // ✅ Preferred keys (your schema)
  $name      = sanitize_text_field(isset($in['name'])      ? $in['name']      : '');
  $lastname  = sanitize_text_field(isset($in['lastname'])  ? $in['lastname']  : '');
  $consentIn = isset($in['consent']) ? (bool)$in['consent'] : null;

  // ↩︎ Back-compat keys (still supported)
  $firstname = sanitize_text_field(isset($in['firstname']) ? $in['firstname'] : '');

  $company   = sanitize_text_field(isset($in['company'])   ? $in['company']   : '');
  $email     = sanitize_text_field(isset($in['email'])     ? $in['email']     : '');
  $phone     = sanitize_text_field(isset($in['phone'])     ? $in['phone']     : '');
  $message   = trim(wp_kses_post(isset($in['message'])     ? $in['message']   : ''));
  $source    = sanitize_text_field(isset($in['source'])    ? $in['source']    : 'website');
  $page_url  = esc_url_raw(isset($in['page_url']) ? $in['page_url'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : ''));

  // Consent: prefer 'consent' boolean; else derive from legacy 'opt_out'
  if ($consentIn !== null) $consent = $consentIn;
  else $consent = ! (bool) (isset($in['opt_out']) ? $in['opt_out'] : false);

  // Display title: prefer provided 'name', else compose from firstname/lastname
  $display = $name !== '' ? $name : trim($firstname.' '.$lastname);

  if ($display===''){ ob_end_clean(); return new WP_REST_Response(['ok'=>false,'error'=>'missing_name','detail'=>'Provide name or firstname/lastname'],400); }
  if ($email===''){   ob_end_clean(); return new WP_REST_Response(['ok'=>false,'error'=>'missing_email'],400); }

  $now  = gmdate('c');
  $real = maxai_discover_notion_props($token,$db);

  // Title key (fall back to 'name' if discovery misses it)
  $titleKey = !empty($real['title']['name']) ? $real['title']['name'] : 'name';

// Build typed properties (force your exact Notion column names)
$props = array();

// Title column = name (Title type)
$props['name'] = maxai_n_title($display);

// Your schema (all lower-case)
if ($lastname !== '')            $props['lastname']   = maxai_n_text($lastname);
                                 $props['email']      = maxai_n_email($email);
if ($phone)                      $props['phone']      = maxai_n_phone($phone);
if ($company)                    $props['company']    = maxai_n_text($company);
if ($message !== '')             $props['message']    = maxai_n_text($message);
if ($page_url)                   $props['page_url']   = maxai_n_url($page_url); // URL type
                                 $props['source']     = maxai_n_text($source);  // rich_text (safe)
                                 $props['consent']    = maxai_n_check($consent);
$props['received_at'] = maxai_n_date($now);   // Date type

// TEMP: disable received_at to test if it’s the culprit
// $props['received_at'] = maxai_n_date($now);


  if (!empty($real['lastname']['name']) && $lastname!=='')  $props[$real['lastname']['name']] = maxai_n_text($lastname);
  if (!empty($real['email']['name']))                       $props[$real['email']['name']]    = maxai_n_email($email);
  if (!empty($real['phone']['name']) && $phone)             $props[$real['phone']['name']]    = maxai_n_phone($phone);
  if (!empty($real['company']['name']) && $company)         $props[$real['company']['name']]  = maxai_n_text($company);
  if (!empty($real['message']['name']) && $message!=='')    $props[$real['message']['name']]  = maxai_n_text($message);

  if (!empty($real['page_url']['name']) && $page_url){
    if (($real['page_url']['type'] === 'url')) $props[$real['page_url']['name']] = maxai_n_url($page_url);
    else                                       $props[$real['page_url']['name']] = maxai_n_text($page_url);
  }

  if (!empty($real['source']['name'])) {
    $t = $real['source']['type'];
    if ($t === 'status')        $props[$real['source']['name']] = maxai_n_status($source);
    elseif ($t === 'select')    $props[$real['source']['name']] = maxai_n_select($source);
    else                        $props[$real['source']['name']] = maxai_n_text($source);
  }

  if (!empty($real['consent']['name'])){
    if ($real['consent']['type'] === 'checkbox') $props[$real['consent']['name']] = maxai_n_check($consent);
    else                                         $props[$real['consent']['name']] = maxai_n_text($consent ? 'Yes' : 'No');
  }

  if (!empty($real['received_at']['name'])){
    if ($real['received_at']['type'] === 'date') $props[$real['received_at']['name']] = maxai_n_date($now);
    else                                         $props[$real['received_at']['name']] = maxai_n_text($now);
  }

  // Page body summary
  $lines = array("Email: $email");
  if ($phone)    $lines[] = "Phone: $phone";
  if ($company)  $lines[] = "Company: $company";
  if ($page_url) $lines[] = "Page: $page_url";
  $lines[] = "Consent: ".($consent ? 'Yes' : 'No');
  if ($source)   $lines[] = "Source: $source";
  if ($message !== '') { $lines[] = ""; $lines[] = "Message:"; $lines[] = $message; }

  $payload = array(
    'parent'     => array('database_id'=>$db),
    'properties' => $props,
    'children'   => array(array(
      'object'=>'block','type'=>'paragraph',
      'paragraph'=>array('rich_text'=>array(array('type'=>'text','text'=>array('content'=>implode("\n",$lines)))))
    )),
  );

  $args = array(
    'headers' => array(
      'Authorization'=>'Bearer '.$token,
      'Content-Type'=>'application/json',
      'Notion-Version'=>'2022-06-28',
    ),
    'body'        => wp_json_encode($payload, JSON_UNESCAPED_UNICODE),
    'timeout'     => 25,
    'data_format' => 'body',
  );

  $resp = wp_remote_post('https://api.notion.com/v1/pages', $args);
  ob_end_clean();

  if (is_wp_error($resp)) return new WP_REST_Response(['ok'=>false,'error'=>'notion_request_failed','detail'=>$resp->get_error_message()],502);
  $code = wp_remote_retrieve_response_code($resp);
  $body = wp_remote_retrieve_body($resp);
  if ($code < 200 || $code >= 300) return new WP_REST_Response(['ok'=>false,'error'=>'notion_http_'.$code,'detail'=> is_string($body)? mb_substr($body,0,1200) : 'Non-JSON'],502);
  $json = json_decode($body,true);
  return new WP_REST_Response(['ok'=>true,'page_id'=> isset($json['id']) ? $json['id'] : null],200);
}
