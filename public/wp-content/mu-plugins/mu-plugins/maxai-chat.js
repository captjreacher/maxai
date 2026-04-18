(function() {
    'use strict';

    const config = window.MAXAI_CHAT_CONFIG || {};
    const AJAX_URL = config.AJAX_URL || '/wp-admin/admin-ajax.php';
    const ICON_URL = config.ICON_URL || '';

    // Create Chat Elements
    function initChat() {
        const container = document.createElement('div');
        container.id = 'maxai-chat-widget';
        container.innerHTML = `
            <style>
                #maxai-chat-widget { position: fixed; bottom: 20px; right: 20px; z-index: 10000; font-family: sans-serif; }
                #maxai-chat-launcher { width: 60px; height: 60px; border-radius: 50%; background: #000; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.3s; }
                #maxai-chat-launcher:hover { transform: scale(1.1); }
                #maxai-chat-launcher img { width: 35px; height: 35px; border-radius: 50%; }
                
                #maxai-chat-window { position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; }
                #maxai-chat-window.open { display: flex; }
                
                #maxai-chat-header { background: #000; color: #fff; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
                #maxai-chat-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9f9f9; }
                
                .maxai-msg { padding: 8px 12px; border-radius: 8px; max-width: 80%; font-size: 14px; line-height: 1.4; }
                .maxai-msg-user { align-self: flex-end; background: #000; color: #fff; }
                .maxai-msg-bot { align-self: flex-start; background: #eee; color: #333; }
                
                #maxai-chat-input-area { padding: 15px; border-top: 1px solid #eee; display: flex; gap: 10px; }
                #maxai-chat-input { flex: 1; border: 1px solid #ddd; padding: 8px; border-radius: 4px; outline: none; }
                #maxai-chat-send { background: #000; color: #fff; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
            </style>
            
            <div id="maxai-chat-window">
                <div id="maxai-chat-header">
                    <span>Maximised AI Assistant</span>
                    <button id="maxai-chat-close" style="background:none; border:none; color:#fff; cursor:pointer; font-size:20px;">&times;</button>
                </div>
                <div id="maxai-chat-messages">
                    <div class="maxai-msg maxai-msg-bot">Hello! How can I help you today?</div>
                </div>
                <form id="maxai-chat-input-area">
                    <input type="text" id="maxai-chat-input" placeholder="Type a message..." required autocomplete="off">
                    <button type="submit" id="maxai-chat-send">Send</button>
                </form>
            </div>
            
            <div id="maxai-chat-launcher">
                <img src="${ICON_URL}" alt="Chat">
            </div>
        `;

        document.body.appendChild(container);

        const launcher = document.getElementById('maxai-chat-launcher');
        const chatWindow = document.getElementById('maxai-chat-window');
        const closeBtn = document.getElementById('maxai-chat-close');
        const form = document.getElementById('maxai-chat-input-area');
        const input = document.getElementById('maxai-chat-input');
        const messages = document.getElementById('maxai-chat-messages');

        launcher.onclick = () => chatWindow.classList.toggle('open');
        closeBtn.onclick = () => chatWindow.classList.remove('open');

        form.onsubmit = async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            addMessage(text, 'user');
            input.value = '';
            
            const typing = addMessage('...', 'bot');

            try {
                const response = await fetch(AJAX_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        action: 'maxai_chat',
                        message: text
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    typing.textContent = data.data.reply;
                } else {
                    typing.textContent = "Sorry, I can't reach the AI right now. Error: " + (data.data.detail || data.data.error || "Unknown");
                }
            } catch (err) {
                typing.textContent = "Error: Network failure.";
            }
            
            messages.scrollTop = messages.scrollHeight;
        };

        function addMessage(text, role) {
            const div = document.createElement('div');
            div.className = `maxai-msg maxai-msg-${role}`;
            div.textContent = text;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
            return div;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }
})();
