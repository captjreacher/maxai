<?php
/**
 * Title: Footer Default
 * Slug: saaslauncher/footer-default
 * Categories: footer
 * Block Types: core/template-part/footer
 * Post Types: wp_template
 * Inserter: true
 */
?>
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"0","right":"0","bottom":"0","left":"0"},"margin":{"top":"0","bottom":"0"}}},"backgroundColor":"black-color","layout":{"type":"constrained","contentSize":"100%"}} -->
<div class="wp-block-group alignfull has-black-color-background-color has-background" style="margin-top:0;margin-bottom:0;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"><!-- wp:group {"style":{"spacing":{"padding":{"top":"48px","right":"var:preset|spacing|40","bottom":"32px","left":"var:preset|spacing|40"}}},"layout":{"type":"constrained","contentSize":"1260px"}} -->
    <div class="wp-block-group" style="padding-top:48px;padding-right:var(--wp--preset--spacing--40);padding-bottom:32px;padding-left:var(--wp--preset--spacing--40)"><!-- wp:columns {"verticalAlignment":"top","style":{"spacing":{"blockGap":{"left":"48px"}}}} -->
        <div class="wp-block-columns are-vertically-aligned-top"><!-- wp:column {"verticalAlignment":"top","width":"42%"} -->
            <div class="wp-block-column is-vertically-aligned-top" style="flex-basis:42%"><!-- wp:group {"layout":{"type":"constrained"}} -->
                <div class="wp-block-group"><!-- wp:site-title {"level":3,"style":{"typography":{"fontSize":"30px","fontStyle":"normal","fontWeight":"700"},"elements":{"link":{"color":{"text":"var:preset|color|light-color"}}}},"textColor":"light-color"} /-->

                    <!-- wp:paragraph {"style":{"spacing":{"margin":{"top":"16px"}},"elements":{"link":{"color":{"text":"var:preset|color|light-color"}}}},"textColor":"light-color"} -->
                    <p class="has-light-color-color has-text-color has-link-color" style="margin-top:16px"><?php esc_html_e('Automate your potential with practical AI systems, workflows, and advisory support built for real businesses.', 'saaslauncher'); ?></p>
                    <!-- /wp:paragraph -->
                </div>
                <!-- /wp:group -->
            </div>
            <!-- /wp:column -->

            <!-- wp:column {"verticalAlignment":"top","width":"58%"} -->
            <div class="wp-block-column is-vertically-aligned-top" style="flex-basis:58%"><!-- wp:navigation {"textColor":"light-color","overlayBackgroundColor":"black-color","overlayTextColor":"light-color","className":"maxai-footer-navigation","layout":{"type":"flex","justifyContent":"right","flexWrap":"wrap"}} /--></div>
            <!-- /wp:column --></div>
        <!-- /wp:columns -->

        <!-- wp:group {"style":{"spacing":{"margin":{"top":"32px"},"padding":{"top":"20px"}},"border":{"top":{"color":"#2f2f2f","width":"1px"}}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->
        <div class="wp-block-group" style="border-top-color:#2f2f2f;border-top-width:1px;margin-top:32px;padding-top:20px"><!-- wp:paragraph {"style":{"elements":{"link":{"color":{"text":"var:preset|color|light-color"}}}},"textColor":"light-color","fontSize":"small"} -->
            <p class="has-light-color-color has-text-color has-link-color has-small-font-size"><?php echo esc_html(gmdate('Y') . ' Maximised AI. All rights reserved.'); ?></p>
            <!-- /wp:paragraph -->

            <!-- wp:social-links {"iconColor":"light-color","iconColorValue":"#ffffff","className":"is-style-logos-only","layout":{"type":"flex","justifyContent":"right"}} -->
            <ul class="wp-block-social-links has-icon-color is-style-logos-only"><!-- wp:social-link {"url":"#","service":"linkedin"} /-->

                <!-- wp:social-link {"url":"#","service":"facebook"} /-->

                <!-- wp:social-link {"url":"#","service":"instagram"} /--></ul>
            <!-- /wp:social-links --></div>
        <!-- /wp:group --></div>
    <!-- /wp:group --></div>
<!-- /wp:group -->
