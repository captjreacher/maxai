<?php
/**
 * Plugin Name: MAXAI – Back to Top (MU)
 * Description: Circular "Back to Top" button with Maximised AI brand gradient (left-aligned) and smooth scroll.
 * Version: 1.2.1
 * Author: Maximised AI
 */

if (!defined('ABSPATH')) exit;

add_action('wp_footer', function () {
?>
  <!-- MAXAI Back to Top -->
  <a href="#" id="scroll-top" aria-label="Back to top">
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  </a>

  <style id="maxai-backtotop-css">
    /* === MAXAI Gradient Back to Top – Forced Left Position === */
    #scroll-top,
    .scroll-top, .scrollToTop, a.scroll-top, a[href="#top"], a[href="#page-top"] {
      position: fixed !important;
      bottom: 40px !important;
      left: 40px !important;     /* force to left side */
      right: auto !important;    /* cancel any theme right align */
      width: 56px !important;
      height: 56px !important;
      border-radius: 50% !important;
      border: none !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      text-decoration: none !important;
      z-index: 9999 !important;

      background: linear-gradient(135deg, #000 0%, #ff4f00 45%, #ffcf00 90%) !important;
      color: #fff !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important;

      transition: all .3s ease;
      opacity: 0;
      visibility: hidden;
      cursor: pointer;
    }

    #scroll-top svg { stroke: currentColor; transform: translateY(1px); }

    #scroll-top:hover {
      background: linear-gradient(135deg, #ffcf00 0%, #ff4f00 45%, #000 90%) !important;
      box-shadow: 0 0 0 2px #ff4f00, 0 8px 20px rgba(0,0,0,0.45) !important;
      transform: scale(1.06);
    }

    /* Show when scrolled */
    body.scrolled #scroll-top {
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Responsive tweak */
    @media (max-width: 768px) {
      #scroll-top {
        bottom: 24px !important;
        left: 24px !important;
        right: auto !important;
        width: 50px !important;
        height: 50px !important;
      }
    }
  </style>

  <script id="maxai-backtotop-js">
    (function(){
      const btn = document.getElementById('scroll-top');
      if (!btn) return;

      function toggle() {
        document.body.classList.toggle('scrolled', window.scrollY > 400);
      }
      window.addEventListener('scroll', toggle, {passive:true});
      toggle();

      btn.addEventListener('click', function(e){
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    })();
  </script>
<?php
});
