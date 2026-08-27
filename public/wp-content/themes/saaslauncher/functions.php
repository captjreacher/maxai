<?php
if (! defined('SAASLAUNCHER_VERSION')) {
	// Replace the version number of the theme on each release.
	define('SAASLAUNCHER_VERSION', wp_get_theme()->get('Version'));
}
define('SAASLAUNCHER_DEBUG', defined('WP_DEBUG') && WP_DEBUG === true);
define('SAASLAUNCHER_DIR', trailingslashit(get_template_directory()));
define('SAASLAUNCHER_URL', trailingslashit(get_template_directory_uri()));

if (! function_exists('saaslauncher_support')) :

	/**
	 * Sets up theme defaults and registers support for various WordPress features.
	 *
	 * @since walker_fse 1.0.0
	 *
	 * @return void
	 */
	function saaslauncher_support()
	{
		// Add default posts and comments RSS feed links to head.
		add_theme_support('automatic-feed-links');
		// Add support for block styles.
		add_theme_support('wp-block-styles');
		add_theme_support('post-thumbnails');
		// Enqueue editor styles.
		add_editor_style('style.css');
		
		// ===== MAXAI THEME SUPPORT ADDITIONS =====
		// Re-enable patterns for MaxAI (fixes pattern conflict)
		add_theme_support('block-patterns');
		
		// MaxAI Custom Colors
		add_theme_support('editor-color-palette', array(
			array(
				'name'  => 'MaximisedAI Orange',
				'slug'  => 'maxai-orange',
				'color' => '#ff4f00',
			),
			array(
				'name'  => 'MaxAI Dark Gray',
				'slug'  => 'maxai-dark-gray',
				'color' => '#111827',
			),
			array(
				'name'  => 'MaxAI Medium Gray',
				'slug'  => 'maxai-medium-gray',
				'color' => '#374151',
			),
			array(
				'name'  => 'MaxAI Light Gray',
				'slug'  => 'maxai-light-gray',
				'color' => '#9ca3af',
			),
		));
		
		// MaxAI Custom Gradients
		add_theme_support('editor-gradient-presets', array(
			array(
				'name'     => 'MaximisedAI Primary',
				'gradient' => 'linear-gradient(135deg, #ff4f00 0%, #dc2626 100%)',
				'slug'     => 'maxai-primary',
			),
			array(
				'name'     => 'MaximisedAI Background',
				'gradient' => 'linear-gradient(135deg, #000000 0%, #374151 50%, #000000 100%)',
				'slug'     => 'maxai-background',
			),
		));
		// ===== END MAXAI ADDITIONS =====
		
		// COMMENTED OUT - Removing default patterns (conflicts with MaxAI)
		// remove_theme_support('core-block-patterns');

		load_theme_textdomain('saaslauncher', get_template_directory());
	}

endif;
add_action('after_setup_theme', 'saaslauncher_support');

// print_r( get_template_directory() );

/*
----------------------------------------------------------------------------------
Enqueue Styles
-----------------------------------------------------------------------------------*/
if (! function_exists('saaslauncher_styles')) :
	function saaslauncher_styles()
	{
		// registering style for theme
		wp_enqueue_style('saaslauncher-style', get_stylesheet_uri(), array(), SAASLAUNCHER_VERSION);
		wp_enqueue_style('saaslauncher-blocks-style', get_template_directory_uri() . '/assets/css/blocks.css');
		wp_enqueue_style('saaslauncher-aos-style', get_template_directory_uri() . '/assets/css/aos.css');
		if (is_rtl()) {
			wp_enqueue_style(
				'saaslauncher-rtl-css',
				get_template_directory_uri() . '/assets/css/rtl.css',
				array(),
				SAASLAUNCHER_VERSION
			);
		}
		wp_enqueue_script('saaslauncher-aos-scripts', get_template_directory_uri() . '/assets/js/aos.js', array('jquery'), SAASLAUNCHER_VERSION, true);
		wp_enqueue_script('saaslauncher-scripts', get_template_directory_uri() . '/assets/js/saaslauncher-scripts.js', array('jquery'), SAASLAUNCHER_VERSION, true);
	}
endif;

// Chat is loaded from the MAXAI MU plugin so there is only one live widget path.

/**
 * Enqueue scripts for admin area
 */
function saaslauncher_admin_style()
{
	if (function_exists('get_current_screen')) {
		$saaslauncher_notice_current_screen = get_current_screen();
	}
	if ((! empty($_GET['page']) && 'about-saaslauncher' === $_GET['page']) || $saaslauncher_notice_current_screen->id === 'themes' || $saaslauncher_notice_current_screen->id === 'dashboard' || $saaslauncher_notice_current_screen->id === 'plugins') {
		wp_enqueue_style('saaslauncher-admin-style', get_template_directory_uri() . '/inc/admin/css/admin-style.css', array(), SAASLAUNCHER_VERSION, 'all');
		wp_enqueue_script('saaslauncher-admin-scripts', get_template_directory_uri() . '/inc/admin/js/saaslauncher-admin-scripts.js', array('jquery'), SAASLAUNCHER_VERSION, true);
		wp_localize_script(
			'saaslauncher-admin-scripts',
			'saaslauncher_admin_localize',
			array(
				'ajax_url'     => admin_url('admin-ajax.php'),
				'nonce'        => wp_create_nonce('saaslauncher_admin_nonce'),
				'welcomeNonce' => wp_create_nonce('saaslauncher_welcome_nonce'),
				'redirect_url' => admin_url('themes.php?page=about-saaslauncher'),
				'scrollURL'    => admin_url('plugins.php?cozy-addons-scroll=true'),
				'demoURL'      => admin_url('themes.php?page=advanced-import'),
			)
		);
	}
}
add_action('admin_enqueue_scripts', 'saaslauncher_admin_style');

/**
 * Enqueue assets scripts for both backend and frontend
 */
function saaslauncher_block_assets()
{
	wp_enqueue_style('saaslauncher-blocks-style', get_template_directory_uri() . '/assets/css/blocks.css');
}
add_action('enqueue_block_assets', 'saaslauncher_block_assets');

/**
 * Load core file.
 */
require_once get_template_directory() . '/inc/core/init.php';

/**
 * Load welcome page file.
 */
require_once get_template_directory() . '/inc/admin/welcome-notice.php';

if (! function_exists('saaslauncher_excerpt_more_postfix')) {
	function saaslauncher_excerpt_more_postfix($more)
	{
		if (is_admin()) {
			return $more;
		}
		return '...';
	}
	add_filter('excerpt_more', 'saaslauncher_excerpt_more_postfix');
}
function saaslauncher_add_woocommerce_support()
{
	add_theme_support('woocommerce');
}
add_action('after_setup_theme', 'saaslauncher_add_woocommerce_support');

// MaximisedAI Pattern Support - START

// Register MaximisedAI pattern category
function maxai_register_patterns() {
    if (function_exists('register_block_pattern_category')) {
        register_block_pattern_category('maxai', array(
            'label' => 'MaximisedAI',
            'description' => 'Custom patterns for MaximisedAI website'
        ));
    }
}
add_action('init', 'maxai_register_patterns');

// Enqueue custom styles for MaximisedAI patterns
function maxai_enqueue_pattern_styles() {
    wp_enqueue_style(
        'maxai-patterns',
        get_template_directory_uri() . '/assets/css/maxai-patterns.css',
        array(),
        SAASLAUNCHER_VERSION
    );
}
add_action('wp_enqueue_scripts', 'maxai_enqueue_pattern_styles');

// Custom block styles for MaximisedAI
function maxai_register_block_styles() {
    if (function_exists('register_block_style')) {
        register_block_style(
            'core/button',
            array(
                'name'  => 'maxai-primary',
                'label' => 'MaximisedAI Primary',
            )
        );
        
        register_block_style(
            'core/button',
            array(
                'name'  => 'maxai-secondary',
                'label' => 'MaximisedAI Secondary',
            )
        );
    }
}
add_action('init', 'maxai_register_block_styles');

// Add MaximisedAI CSS classes to body
function maxai_body_classes($classes) {
    $classes[] = 'maxai-theme';
    return $classes;
}
add_filter('body_class', 'maxai_body_classes');

// MAXAI: contact page AJAX submit + confirmation
add_action('wp_footer', function () {
    if (!is_page('contact-us')) {
        return;
    }
    ?>
    <script>
    (function () {
      var endpoint = '/wp-json/maxai/v1/contact';
      var successMessage = "We'll be in touch soon.";
      var errorMessage = 'We could not send your message just now. Please try again.';

      function findForm() {
        return document.querySelector('form.contact-form');
      }

      function pick(form, selector) {
        var el = form ? form.querySelector(selector) : null;
        return el ? String(el.value || '').trim() : '';
      }

      function isChecked(form, selector) {
        var el = form ? form.querySelector(selector) : null;
        return !!(el && el.checked);
      }

      function attributionSource() {
        var allowed = {
          'case-study-supercity': true,
          'case-studies': true,
          'homepage': true
        };
        var value = '';
        try {
          value = new URLSearchParams(window.location.search).get('source') || '';
        } catch (e) {}
        return allowed[value] ? value : 'Contact Page';
      }

      function buildPayload(form) {
        var first = pick(form, 'input[name="firstname"], input[name="first_name"]');
        var last = pick(form, 'input[name="lastname"], input[name="last_name"]');
        var name = (first + ' ' + last).replace(/\s+/g, ' ').trim();

        return {
          firstname: first,
          lastname: last,
          name: name,
          email: pick(form, 'input[name="email"], input[type="email"]'),
          phone: pick(form, 'input[name="phone"], input[type="tel"]'),
          company: pick(form, 'input[name="company"]'),
          message: pick(form, 'textarea[name="message"], textarea'),
          consent: !isChecked(form, 'input[name="opt_out"], input[name="marketing_opt_out"]'),
          opt_out: isChecked(form, 'input[name="opt_out"], input[name="marketing_opt_out"]'),
          source: attributionSource(),
          page_url: window.location.href
        };
      }

      function ensureNotice(form) {
        if (!form || !form.parentNode) {
          return null;
        }

        var box = form.parentNode.querySelector('.maxai-contact-confirmation');
        if (box) {
          return box;
        }

        box = document.createElement('div');
        box.className = 'maxai-contact-confirmation';
        box.setAttribute('role', 'status');
        box.setAttribute('aria-live', 'polite');
        box.style.display = 'none';
        box.style.margin = '0 0 16px';
        box.style.padding = '14px 16px';
        box.style.borderRadius = '12px';
        box.style.fontWeight = '600';

        form.parentNode.insertBefore(box, form);
        return box;
      }

      function showNotice(form, message, isError) {
        var box = ensureNotice(form);
        if (!box) {
          return;
        }

        box.textContent = message;
        box.style.display = 'block';
        box.style.border = isError ? '1px solid #ff8b8b' : '1px solid #ff4f00';
        box.style.background = isError ? 'rgba(255, 90, 90, 0.10)' : 'rgba(255, 79, 0, 0.10)';
        box.style.color = isError ? '#ffd5d5' : '#ff4f00';
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      function setBusy(form, isBusy) {
        var button = form ? form.querySelector('button[type="submit"], input[type="submit"]') : null;
        if (!button) {
          return;
        }

        if (!button.hasAttribute('data-maxai-label')) {
          button.setAttribute('data-maxai-label', button.textContent || button.value || 'Submit');
        }

        button.disabled = !!isBusy;
        if ('value' in button && button.tagName === 'INPUT') {
          button.value = isBusy ? 'Sending...' : button.getAttribute('data-maxai-label');
        } else {
          button.textContent = isBusy ? 'Sending...' : button.getAttribute('data-maxai-label');
        }
      }

      function clearTargets(form) {
        if (!form) {
          return;
        }

        form.removeAttribute('target');
        form.target = '';

        var submits = form.querySelectorAll('button, input[type="submit"]');
        Array.prototype.forEach.call(submits, function (button) {
          button.removeAttribute('formtarget');
          if (button.formTarget) {
            button.formTarget = '';
          }
        });
      }

      async function submitViaAjax(form) {
        if (!form || form.__maxaiSubmitting) {
          return;
        }

        form.__maxaiSubmitting = true;
        setBusy(form, true);

        try {
          var response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store'
            },
            credentials: 'same-origin',
            body: JSON.stringify(buildPayload(form))
          });

          var data = {};
          try {
            data = await response.json();
          } catch (jsonError) {
            data = {};
          }

          if (!response.ok || !data.ok) {
            throw new Error(data.error || data.message || 'Request failed');
          }

          form.reset();
          showNotice(form, successMessage, false);
        } catch (error) {
          console.error('[MAXAI] contact submit failed', error);
          showNotice(form, errorMessage, true);
        } finally {
          form.__maxaiSubmitting = false;
          setBusy(form, false);
        }
      }

      function wireForm(form) {
        if (!form || form.__maxaiWired) {
          return;
        }

        form.__maxaiWired = true;
        form.setAttribute('data-maxai-contact-owned', '1');
        clearTargets(form);

        form.addEventListener('submit', function (event) {
          event.preventDefault();
          submitViaAjax(form);
        });
      }

      function init() {
        wireForm(findForm());
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
      } else {
        init();
      }
    })();
    </script>
    <?php
}, 100);

// MaximisedAI Pattern Support - END
