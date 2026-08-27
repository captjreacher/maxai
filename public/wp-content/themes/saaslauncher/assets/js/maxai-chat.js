(function () {
  if (window.MAXAI_CHAT_LOADED) return; window.MAXAI_CHAT_LOADED = true;

  var CHAT_ENDPOINT = "/wp-json/maxai/v1/chat";
  var DEFAULT_MODEL = "gpt-3.5-turbo-0125";
  var CONTACT_URL   = (window.MAXAI_CHAT_CONFIG && window.MAXAI_CHAT_CONFIG.contactUrl) || (window.location.origin + "/contact-us/");
  var CONTACT_INTENT= /(contact( us)?|talk to (you|human|team)|email|phone)/i;

  // <-- Use localized data from PHP (most reliable)
  var ICON_URL = (window.MAXAI_CHAT_CONFIG && window.MAXAI_CHAT_CONFIG.ICON_URL)
                 || "/wp-content/themes/saaslauncher/assets/chat-icon.webp";


  function $(s){return document.querySelector(s);}
  function el(t,a,css,txt){var e=document.createElement(t); if(a)for(var k in a)e.setAttribute(k,a[k]); if(css)Object.assign(e.style,css); if(txt!=null)e.textContent=String(txt); return e;}
  function addMsg(box, text, who){
    var wrap = el('div', null, {margin:'6px 0', textAlign: who==='user'?'right':'left'});
    var b = el('span', null, {
      display:'inline-block', maxWidth:'85%', padding:'8px 10px', borderRadius:'12px',
      whiteSpace:'pre-wrap',
      color:'#111',
      background: who==='user' ? '#ffe9e0' : '#f2f2f2',
      border:     who==='user' ? '1px solid #ffd1bf' : '1px solid #e6e6e6'
    }, text||'');
    wrap.appendChild(b); box.appendChild(wrap); box.scrollTop = box.scrollHeight;
  }
  function addTyping(box){
    var dots = el('span', {'data-typing':'1'}, {
      display:'inline-block', padding:'8px 10px', borderRadius:'12px',
      background:'#f2f2f2', border:'1px solid #e6e6e6', color:'#111'
    }, '…');
    var wrap = el('div',null,{margin:'6px 0',textAlign:'left'}); wrap.appendChild(dots);
    box.appendChild(wrap); box.scrollTop = box.scrollHeight; return dots;
  }
  function removeTyping(box){ var t=box.querySelector('[data-typing]'); if(t&&t.parentNode)t.parentNode.remove(); }
  function openContactPage(){ (top||window).location.href = CONTACT_URL; }

  // ------ ICON (no external image) ------
  function ensureIcon(){
    var icon = $('#chat-icon, #maxai-chat-icon, [data-maxai-chat-icon]');
    if (icon) return icon;

    icon = el('button', { id:'chat-icon', type:'button', title:'Chat' }, {
      position:'fixed', bottom:'24px', right:'92px',
      width:'64px', height:'64px', border:'0', borderRadius:'50%',
      cursor:'pointer', zIndex:'2147483647', color:'#fff',
      backgroundImage:'linear-gradient(135deg,#000 0%,#ff4f00 45%,#ffcf00 90%)',
      boxShadow:'0 0 0 2px rgba(255,79,0,.35), 0 10px 18px rgba(0,0,0,.45)',
      display:'grid', placeItems:'center'
    });

    // Inline SVG chat bubble + spark
    icon.innerHTML =
      '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
      '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4.5A4 4 0 0 1 1 13V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8z"></path>'+
      '<path d="M17 4l.5-1.5M20 6l1.5-.5M18 8l1 1"></path></svg>';

    document.body.appendChild(icon);
    return icon;
  }

  // ------ MODAL ------
  function ensureModal(){
    var m = $('#chat-modal'); if (m) return m;

    m = el('div', {id:'chat-modal', role:'dialog', 'aria-modal':'true', 'aria-label':'Maximised AI Assistant'}, {
      position:'fixed', bottom:'100px', right:'20px', width:'360px', height:'520px',
      display:'none', flexDirection:'column', background:'#fff', color:'#000',
      border:'1px solid #ccc', borderRadius:'12px', boxShadow:'0 8px 24px rgba(0,0,0,.24)',
      zIndex:'2147483646', overflow:'hidden'
    });

    var header = el('div', null, {
      background:'#ff4f00', color:'#fff', padding:'10px 12px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      fontWeight:'600', fontSize:'14px', borderBottom:'1px solid rgba(255,255,255,.2)'
    });
    header.appendChild(el('span', null, null, 'Maximised AI Assistant'));
    var actions = el('div', null, {display:'flex', gap:'8px', alignItems:'center'});
    var btnContact = el('button', {type:'button', id:'maxai-btn-contact'}, {
      border:'0', background:'rgba(255,255,255,.18)', color:'#fff',
      padding:'6px 10px', borderRadius:'8px', cursor:'pointer', fontWeight:'600'
    }, 'Contact');
    var btnClose = el('button', {type:'button', 'aria-label':'Close'}, {
      background:'none', border:'0', color:'#fff', fontSize:'18px', cursor:'pointer', lineHeight:'1'
    }, '×');
    actions.appendChild(btnContact); actions.appendChild(btnClose); header.appendChild(actions);

    var box = el('div', {id:'chat-box'}, {flex:'1', padding:'12px', overflowY:'auto', fontSize:'14px', lineHeight:'1.5'});
    var row = el('div', null, {display:'flex', gap:'8px', alignItems:'center', padding:'10px', borderTop:'1px solid #eee', background:'#fafafa'});
    var input = el('input', {id:'chat-input', type:'text', placeholder:'Type a message…'}, {
      flex:'1', border:'1px solid #ddd', borderRadius:'8px', padding:'10px 12px', fontSize:'14px', outline:'none'
    });
    var send  = el('button', {id:'chat-send', type:'button'}, {
      border:'0', borderRadius:'8px', padding:'10px 14px', background:'#ff4f00', color:'#fff', fontWeight:'600', fontSize:'14px', cursor:'pointer'
    }, 'Send');

    row.appendChild(input); row.appendChild(send);
    m.appendChild(header); m.appendChild(box); m.appendChild(row);
    document.body.appendChild(m);

    addMsg(box, 'Hi! Type “contact” or click Contact to reach us.', 'assistant');

    btnContact.addEventListener('click', function(){ addMsg(box,'Opening the contact page…','assistant'); openContactPage(); });
    btnClose  .addEventListener('click', function(){ m.style.display='none'; });

    function handleSend(){
      var msg = (input.value||'').trim(); if (!msg) return;
      addMsg(box, msg, 'user'); input.value='';

      if (CONTACT_INTENT.test(msg)) { addMsg(box,'Opening the contact page…','assistant'); openContactPage(); return; }

      var typing = addTyping(box);

      fetch(CHAT_ENDPOINT, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ message: msg, model: DEFAULT_MODEL })
      })
      .then(function(r){ return r.json().catch(function(){ throw new Error('Invalid JSON from server'); }); })
      .then(function(out){
        removeTyping(box);
        if (out && out.ok === true && typeof out.reply === 'string' && out.reply.trim() !== '') {
          addMsg(box, out.reply.trim(), 'assistant');
        } else {
          addMsg(box, (out && (out.detail||out.error)) || 'Sorry, something went wrong.', 'assistant');
          console.warn('[MAXAI] Unexpected response:', out);
        }
      })
      .catch(function(err){
        removeTyping(box);
        console.error('[MAXAI] chat error', err);
        addMsg(box, 'Network error: ' + err.message, 'assistant');
      });
    }

    send .addEventListener('click', handleSend);
    input.addEventListener('keydown', function(e){ if (e.key==='Enter'){ e.preventDefault(); handleSend(); } });
    m._ui = {box,input,send,btnContact};
    return m;
  }

  function toggle(){
    var m = ensureModal();
    m.style.display = (m.style.display==='none') ? 'flex' : 'none';
    if (m.style.display==='flex') setTimeout(()=>m._ui?.input?.focus(),0);
  }

  function attach(){
    var icon = ensureIcon(); ensureModal();
    if (!icon._maxaiBound){ icon._maxaiBound = true; icon.addEventListener('click', toggle); }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();

  window.maxaiToggle = toggle;
})();
