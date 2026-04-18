<?php
/*
*
* Unfurl - One Click To Post
*
* @package     UnfurlMetadataToPost
* @author      JMT
* @copyright   2017 JMT jmth@tuta.io
* @license     GPL-2.0+
*
* @wordpress-plugin
* Plugin Name: Unfurl - One Click To Post
* Plugin URI:  https://wp.tomatohunter.com/unfurl/
* Description: Share and unfurl external link as a new post with one click directly from WordPress dashboard. The plugin reads metadata and downloads basic information including thumbnail url.
* Version:     0.2.1
* Author:      JMT
* Author URI:  https://bitbucket.org/xin_chao/
* Text Domain: esl
* License:     GPL-2.0+
* License URI: http://www.gnu.org/licenses/gpl-2.0.txt
*
*/

defined( 'ABSPATH' ) or die( 'u wot m8' );

require_once( ABSPATH . '/wp-admin/includes/plugin.php');
require_once( ABSPATH . '/wp-admin/includes/media.php');
require_once( ABSPATH . '/wp-admin/includes/file.php');
require_once( ABSPATH . '/wp-admin/includes/image.php');
require_once( ABSPATH . 'wp-includes/pluggable.php');

// Plugin funcionality wrapped here

function esl_whatever(){

/**
   === Helpers ===
**/
  /**
  * Checks if the current visitor is a logged in user.
  * @return bool True if user is logged in, false if not logged in.
  */
  if ( !function_exists('is_user_logged_in') ) :
  function is_user_logged_in() {
  	$user = wp_get_current_user();
  	if ( empty( $user->ID ) )
  		return false;
  	return true;
  }
  endif;
  /**
  * Fetches link's metadata
  *
  * @param string $url    The URL of the page to download.
  * @return array $data   Array of all meta tags.
  */
  function esl_file_get_contents_curl($url) {
      $response = wp_remote_get( $url );
      $data = wp_remote_retrieve_body( $response );
      return $data;
  }
  /**
  * Downloads an image from the specified URL and attaches it to a post as a post thumbnail.
  *
  * @param string $url      The URL of the image to download.
  * @param int    $post_id  The post ID the post thumbnail is to be associated with.
  * @return string          Attachment URL.
  */
  function esl_upload_image($url, $post_id) {
    $image = "";
    if($url != "") {
        $segments = parse_url($url);
        $url = $segments["scheme"] . "://" . $segments["host"] . $segments["path"];
        $url = esc_url_raw($url);
        $file = array();
        $file['name'] = $url;
        $file['tmp_name'] = download_url($url);
        if (is_wp_error($file['tmp_name'])) {
            @unlink($file['tmp_name']);
            add_action( 'admin_notices', 'esl_notice_feature__error' );
        } else {
            $attachmentId = media_handle_sideload($file, $post_id);
            if ( is_wp_error($attachmentId) ) {
                @unlink($file['tmp_name']);
                add_action( 'admin_notices', 'esl_notice_feature__error' );

            } else {
                set_post_thumbnail( $post_id, $attachmentId );
                $image = wp_get_attachment_url( $attachmentId );
            }
        }
    } else {
      add_action( 'admin_notices', 'esl_notice_void__error' );
    }
    return $image;
  }
  /**
  * Puts a  Metabox to theWP dashboard
  *
  * @see https://developer.wordpress.org/plugins/metadata/custom-meta-boxes/
  **/
  if ( is_admin() || ( !defined( 'DOING_AJAX' ) || !DOING_AJAX ) ) {
    function esl_add_dashboard_widgets() {
    	wp_add_dashboard_widget(
          'esl_dashboard_widget',         // Widget slug.
          'Unfurl - Metadata to post',              // Title.
          'esl_dashboard_widget_function' // Display function.
      );
    }
    function esl_dashboard_widget_function() {
    	echo "<p>Insert your link:</p>";
      echo "<form enctype=\"multipart/form-data\" action=\"\" method=\"post\">";
      echo "<input type=\"text\" name=\"esl_input\" id=\"esl_input\" style=\"width:100%\"><br><input name=\"submit\" type=\"submit\" value=\"Submit\">";
      wp_nonce_field( 'esl_link_post_action', 'esl_link_post_field' );
      echo "</form>";
      // esc_url_raw()
    }
    add_action( 'wp_dashboard_setup', 'esl_add_dashboard_widgets' );
  }
  /**
  * Wordpress admit notices
  *
  **/
  function esl_notice__success( ) {
    ?>
    <div class="notice notice-success is-dismissible">
        <p><?php _e( 'Posted successfully.', 'esl' ); ?></p>
    </div>
    <?php
  }
  function esl_notice_feature__error( ) {
  	$class = 'notice notice-warning';
  	$message = __( 'Could not download image, posting without thumbnail.', 'esl' );

  	printf( '<div class="%1$s"><p>%2$s</p></div>', esc_attr( $class ), esc_html( $message ) );
  }
  function esl_notice_void__error( ) {
  	$class = 'notice notice-warning';
  	$message = __( 'Image reference was empty.', 'esl' );

  	printf( '<div class="%1$s"><p>%2$s</p></div>', esc_attr( $class ), esc_html( $message ) );
  }
  function esl_notice_post__error( ) {
  	$class = 'notice notice-error';
  	$message = __( 'Could not make the post. Please check the URL.', 'esl' );

  	printf( '<div class="%1$s"><p>%2$s</p></div>', esc_attr( $class ), esc_html( $message ) );
  }


/**
   === // END HELPERS ===
**/

  $call = "";
  if( isset( $_POST['submit'] ) ) {
   if ( ! isset( $_POST['esl_link_post_field'] ) || ! wp_verify_nonce( $_POST['esl_link_post_field'], 'esl_link_post_action' ) ) {
     add_action( 'admin_notices', 'esl_notice_post__error' );
     return new WP_Error( 'nonce_failed', __( 'Nonce failed' ) );
     exit;
   } else {
     $call = esc_url_raw($_POST['esl_input']);
   }
  }

  // URL validation
  if( (filter_var($call, FILTER_VALIDATE_URL)) && (preg_match("@^https?://@", $call )==1) ) {

    $html = esl_file_get_contents_curl($call);
    // Parser
    $doc = new DOMDocument();
    @$doc->loadHTML($html);
    $nodes = $doc->getElementsByTagName('title');

    // Metadata
    $metas = $doc->getElementsByTagName('meta');
    // Defaults
    $title = $nodes->item(0)->nodeValue;
    if ($title=="" || empty($title)) {
      $title = "Read more at $call";
      //return new WP_Error( 'title_failed', __( 'No title' ) );
    } elseif ( 0 === strpos($title, 'Attention Required!') )  { // blocked by Cloudflare
      $title = "Shared from $call";
    }
    $tsearch = array('&#8222;', '&#8220;', '&#146;');
    $treplace = array('"', '"', "'");
    $title = htmlentities(str_replace($tsearch, $treplace, $title), ENT_QUOTES);
    // free photo via flickr
    // @uri https://flic.kr/p/bodHtd
    // FIXME shouldn't download it over and over
    $feature = 'https://c1.staticflickr.com/8/7067/6815011438_825b20ff5e_z.jpg';
    $description = 'Shared article.';
    // Category slug
    $cat = 2;

    for ($i = 0; $i < $metas->length; $i++) {
      $meta = $metas->item($i);
      // title with encoded characters
      if($meta->getAttribute('name') == 'twitter:title')
          $title = $meta->getAttribute('content');
      elseif($meta->getAttribute('property') == 'og:title')
          $title = $meta->getAttribute('content');
      // feature image
      if($meta->getAttribute('name') == 'twitter:image:src')
          $feature = $meta->getAttribute('content');
      elseif($meta->getAttribute('name') == 'twitter:image')
          $feature = $meta->getAttribute('content');
      elseif($meta->getAttribute('name') == 'sailthru.image.full') //sailthru.image.full
          $feature = $meta->getAttribute('content');
      elseif($meta->getAttribute('property') == 'og:image') //property="og:image"
          $feature = $meta->getAttribute('content');
      // description
      if($meta->getAttribute('name') == 'twitter:description')
          $description = $meta->getAttribute('content');
      elseif($meta->getAttribute('name') == 'description')
          $description = $meta->getAttribute('content');
      elseif($meta->getAttribute('property') == 'twitter:description')
          $description = $meta->getAttribute('content');

    }


    $encoded = htmlentities( sanitize_text_field( $description ) );
    // wrongly formatted strings
    $encoded = str_replace( '&acirc;', '\'', $encoded );
    $encoded = str_replace( '&Acirc;', '\'', $encoded );



    $full = "<p>$encoded</p><p>Read more at <a href=\"$call\" target=\"_blank\">$call</a></p>";

    $to_post = array(
        'post_title'    => esc_html( $title ),
        'post_excerpt'  => $encoded,
        'post_content'  => $full,
        'post_status'   => 'publish',
        'post_author'   => 1,
        'post_category' => array( $cat )
    );

    $post_id = wp_insert_post( $to_post );
    //var_dump($post_id);
    if ( is_int($post_id) ) {
      esl_upload_image( $feature, $post_id );
      add_action( 'admin_notices', 'esl_notice__success' );
    } else {
      return new WP_Error( 'thumb_failed', __( 'Cannot generate thumb' ) );
    }

  } else { // invalid url
    return new WP_Error( 'callload', __( 'Invalid Link' ) );
    add_action( 'admin_notices', 'esl_notice_post__error' );
  }

}

// init
add_action( 'init', 'esl_whatever' );
