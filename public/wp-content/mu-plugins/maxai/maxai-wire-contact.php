<?php
/**
 * Plugin Name: MAXAI – Wire Public Forms to Cockpit (MU, head)
 * Description: Routes MaximisedAI contact and newsletter/signup forms through the canonical Cockpit intake endpoint.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) exit;

add_action('wp_head', function(){
?>
<script id="maxai-wire-contact" type="text/javascript">
(function(){
  function log(){ try{ console.log.apply(console, ['[MAXAI-INTAKE]'].concat([].slice.call(arguments))); }catch(e){} }
  function q(form, sel){ return form ? form.querySelector(sel) : null; }
  function val(form, sel){ var el=q(form,sel); return el ? String(el.value||'').trim() : ''; }
  function checked(form, sel){ var el=q(form,sel); return el ? !!el.checked : false; }

  function email(form){ return val(form,'input[name="email"]') || val(form,'input[type="email"]'); }
  function first(form){ return val(form,'input[name="firstname"]') || val(form,'input[name="first_name"]') || val(form,'[placeholder*="First"]'); }
  function last(form){ return val(form,'input[name="lastname"]') || val(form,'input[name="last_name"]') || val(form,'[placeholder*="Last"]'); }
  function name(form){ var n=val(form,'input[name="name"]'); if(!n) n=(first(form)+' '+last(form)).replace(/\s+/g,' ').trim(); return n; }
  function message(form){ var m=val(form,'textarea[name="message"]'); if(!m){ var ta=q(form,'textarea'); m=ta ? String(ta.value||'').trim() : ''; } return m; }
  function company(form){ return val(form,'input[name="company"]') || val(form,'input[name="organisation"]'); }

  function actionText(form){ return String((form && form.getAttribute('action')) || '').toLowerCase(); }
  function submitText(form){ var b=q(form,'button[type="submit"],input[type="submit"]'); return b ? String(b.textContent || b.value || '').toLowerCase() : ''; }
  function isEmailOctopus(form){ return actionText(form).indexOf('emailoctopus') !== -1; }
  function isSignup(form){
    if (!form) return false;
    if (form.getAttribute('data-maxai-intent') === 'signup') return true;
    if (isEmailOctopus(form)) return true;
    var text=submitText(form);
    if (/subscribe|sign\s*up|join|newsletter/.test(text)) return true;
    return !!email(form) && !message(form) && window.location.pathname.indexOf('/contact-us') === -1;
  }
  function isContact(form){
    if (!form) return false;
    if (form.getAttribute('data-maxai-intent') === 'general_enquiry') return true;
    if (window.location.pathname.indexOf('/contact-us') === 0) return !!email(form);
    return !!email(form) && !!message(form);
  }

  function payload(form, intent){
    var optOut = checked(form,'input[name="opt_out"]') || checked(form,'input[name="marketing_opt_out"]') || checked(form,'input[id*="opt"]');
    return {
      intent: intent,
      name: name(form),
      email: email(form),
      organisation: company(form),
      message: message(form),
      marketing_consent: intent === 'signup' ? true : !optOut,
      source_page: window.location.pathname || '/',
      referrer: document.referrer || null,
      page_url: window.location.href,
      website: val(form,'input[name="website"]') || val(form,'input[name="company_website"]')
    };
  }

  function post(payload){
    return fetch('/wp-json/maxai/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'same-origin'
    }).then(function(r){
      return r.json().then(function(j){ return {status:r.status, body:j}; });
    });
  }

  function showError(form, text){
    try{
      var box=form.querySelector('.maxai-intake-error');
      if(!box){
        box=document.createElement('div');
        box.className='maxai-intake-error';
        box.style.marginTop='12px';
        box.style.color='#ff8a3d';
        box.setAttribute('role','alert');
        form.appendChild(box);
      }
      box.textContent=text || 'Unable to submit right now. Please try again.';
    }catch(e){}
  }

  document.addEventListener('submit', function(ev){
    var form=ev && ev.target ? ev.target : null;
    if (!form || !form.querySelector) return;
    if (form.getAttribute('data-maxai-contact-owned') === '1') return;

    var signup=isSignup(form);
    var contact=!signup && isContact(form);
    if (!signup && !contact) return;

    var p=payload(form, signup ? 'signup' : 'general_enquiry');
    if (!p.email) return;

    var ownSubmission = signup || isEmailOctopus(form) || form.getAttribute('data-maxai-intake-owned') === '1';
    if (ownSubmission) ev.preventDefault();

    post(p).then(function(result){
      if (result.status >= 200 && result.status < 300 && result.body && result.body.ok) {
        log('captured', p.intent, p.email);
        if (signup) {
          window.location.assign('/blog-sign-up/');
        }
        return;
      }
      log('capture failed', result);
      if (ownSubmission) showError(form, result.body && result.body.error);
    }).catch(function(err){
      log('capture error', err);
      if (ownSubmission) showError(form);
    });
  }, true);

  window.MAXAI_INTAKE_READY = true;
  log('ready');
})();
</script>
<?php
});
