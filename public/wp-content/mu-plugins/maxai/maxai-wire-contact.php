<?php
/**
 * Plugin Name: MAXAI – Wire Contact Form to Notion (MU, head)
 * Description: Mirrors ANY form submit to /wp-json/maxai/v1/contact. Injected in <head>, ES5-only, capture-phase.
 * Version: 0.3.0
 */
if (!defined('ABSPATH')) exit;

/* inject early so it runs even if other scripts error later */
add_action('wp_head', function(){
?>
<script id="maxai-wire-contact" type="text/javascript">
(function(){
  function log(){ try{ console.log.apply(console, ['[MAXAI-WIRE]'].concat([].slice.call(arguments))); }catch(e){} }

  function q(form, sel){ return form ? form.querySelector(sel) : null; }
  function val(form, sel){
    var el = q(form, sel);
    return el ? (el.value||'').trim() : '';
  }
  function checked(form, sel){
    var el = q(form, sel);
    return el ? !!el.checked : false;
  }

  function buildPayload(form){
    // prefer explicit name= attributes; fallback to placeholders
    var first = val(form,'input[name="firstname"]') || val(form,'input[name="first_name"]') || val(form,'[placeholder*="First"]');
    var last  = val(form,'input[name="lastname"]')  || val(form,'input[name="last_name"]')  || val(form,'[placeholder*="Last"]');

    var name  = val(form,'input[name="name"]');
    if(!name){ name = (first+' '+last).replace(/\s+/g,' ').trim(); }

    var email   = val(form,'input[name="email"]') || val(form,'input[type="email"]');
    var phone   = val(form,'input[name="phone"]') || val(form,'input[type="tel"]');
    var company = val(form,'input[name="company"]');

    var message = val(form,'textarea[name="message"]');
    if(!message){
      var ta = q(form,'textarea'); message = ta ? (ta.value||'').trim() : '';
    }

    // your checkbox says "Select to opt out…" => consent = NOT checked
    var optOut = checked(form,'input[name="opt_out"]') || checked(form,'input[name="marketing_opt_out"]') || checked(form,'input[id*="opt"]');

    var payload = {
      // your Notion schema keys:
      name:     name,
      lastname: last,
      email:    email,
      phone:    phone,
      company:  company,
      message:  message,
      page_url: window.location.href,
      source:   'contact-form',
      consent:  !optOut,

      // back-compat keys (server ignores if not needed)
      firstname: first,
      opt_out:   !!optOut
    };
    return payload;
  }

  function postToNotion(payload){
    try{
      return fetch('/wp-json/maxai/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
      }).then(function(r){ return r.json(); })
        .then(function(j){ log('posted', j); return j; })
        .catch(function(err){ log('fetch error', err); return {ok:false,error:String(err)}; });
    }catch(e){ log('postToNotion error', e); return Promise.resolve({ok:false,error:String(e)}); }
  }

  // Capture EVERY submit (before other handlers), do not block default submit
  document.addEventListener('submit', function(ev){
    try{
      var form = ev && ev.target ? ev.target : null;
      if (form && form.getAttribute && form.getAttribute('data-maxai-contact-owned') === '1') {
        log('skipped owned form');
        return;
      }
      var p = buildPayload(form);
      // minimally require name + email to avoid noise
      if (p && p.name && p.email) {
        log('submit payload', p);
        postToNotion(p);
      } else {
        log('skipped (missing name/email)', p);
      }
    }catch(e){ log('submit hook error', e); }
  }, true);

  // quick console test: type maxaiWireTest()
  window.maxaiWireTest = function(){
    var p = buildPayload(document);
    if(!p.name)  p.name  = 'Console Test';
    if(!p.email) p.email = 'console@example.com';
    log('console test payload', p);
    return postToNotion(p);
  };

  window.MAXAI_WIRE_READY = true;
  log('head script ready');
})();
</script>
<?php
});
