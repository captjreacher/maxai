<?php
/**
 * Plugin Name: MaxAI Listener
 * Description: Receives mirrored posts from MGRNZ via Supabase.
 */
add_action('rest_api_init', function(){
  register_rest_route('maxai/v1', '/mirror', [
    'methods' => 'POST',
    'callback' => function($req){
      $data = $req->get_json_params();
      if(empty($data['slug'])) return new WP_Error('bad_request','Missing slug',400);
      $post = get_page_by_path($data['slug'], OBJECT, 'post');
      $arr = [
        'post_title' => $data['acf']['title'] ?? $data['slug'],
        'post_status'=> $data['status'],
        'post_type'  => 'post',
        'post_content'=> $data['acf']['content'] ?? '',
      ];
      if($post){ $arr['ID']=$post->ID; wp_update_post($arr); }
      else { wp_insert_post($arr); }
      return ['ok'=>true];
    },
    'permission_callback' => '__return_true'
  ]);
});
