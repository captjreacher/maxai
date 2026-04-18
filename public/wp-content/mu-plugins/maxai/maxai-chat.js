(function () {
    'use strict';

    if (window.MAXAI_CHAT_BOOTSTRAPPED) {
        return;
    }

    window.MAXAI_CHAT_BOOTSTRAPPED = true;

    var config = window.MAXAI_CHAT_CONFIG || {};
    var REST_URL = config.restUrl || '/wp-json/maxai/v1/chat';
    var REST_NONCE = config.restNonce || '';
    var ICON_URL = config.iconUrl || '';
    var GREETING = config.greeting || 'Hello! How can I help you today?';
    var STORAGE_KEY = 'maxai_chat_previous_response_id';
    var CONTACT_URL = config.contactUrl || buildContactUrl();
    var CONTACT_INTENT = /(contact( us)?|request to be contacted|be contacted|call me|have someone contact me|get in touch|talk to (a )?human|speak to (someone|a person|the team)|book a call|request a callback|callback)/i;

    function initChat() {
        if (document.getElementById('maxai-chat-widget')) {
            return;
        }

        var container = document.createElement('div');
        container.id = 'maxai-chat-widget';
        container.innerHTML = [
            '<style>',
            '#maxai-chat-widget{position:fixed;right:20px;bottom:20px;z-index:10000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
            '#maxai-chat-launcher{width:74px;height:74px;border:0;border-radius:50%;background:#111;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 34px rgba(0,0,0,.28);padding:0;overflow:hidden;}',
            '#maxai-chat-launcher img{width:50px;height:50px;border-radius:50%;display:block;object-fit:cover;}',
            '#maxai-chat-window{position:absolute;right:0;bottom:80px;width:min(360px,calc(100vw - 32px));height:min(540px,calc(100vh - 120px));display:none;flex-direction:column;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 24px 48px rgba(15,23,42,.22);}',
            '#maxai-chat-window.is-open{display:flex;}',
            '#maxai-chat-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#111;color:#fff;}',
            '#maxai-chat-title{font-size:15px;font-weight:600;}',
            '#maxai-chat-close{border:0;background:transparent;color:#fff;font-size:24px;line-height:1;cursor:pointer;}',
            '#maxai-chat-messages{flex:1;padding:16px;background:#f8fafc;overflow-y:auto;display:flex;flex-direction:column;gap:10px;}',
            '.maxai-msg{max-width:85%;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word;}',
            '.maxai-msg-user{align-self:flex-end;background:#111;color:#fff;border-bottom-right-radius:4px;}',
            '.maxai-msg-bot{align-self:flex-start;background:#fff;color:#111827;border:1px solid #e5e7eb;border-bottom-left-radius:4px;}',
            '.maxai-msg-error{border-color:#fecaca;background:#fef2f2;color:#991b1b;}',
            '#maxai-chat-form{display:flex;gap:10px;padding:14px 16px;border-top:1px solid #e5e7eb;background:#fff;}',
            '#maxai-chat-input{flex:1;min-width:0;border:1px solid #d1d5db;border-radius:10px;padding:10px 12px;font:inherit;}',
            '#maxai-chat-send{border:0;border-radius:10px;background:#111;color:#fff;padding:0 14px;font:inherit;font-weight:600;cursor:pointer;}',
            '#maxai-chat-send[disabled],#maxai-chat-input[disabled]{opacity:.65;cursor:not-allowed;}',
            '@media (max-width: 640px){#maxai-chat-widget{right:12px;bottom:12px;}#maxai-chat-window{right:0;bottom:88px;width:min(360px,calc(100vw - 24px));height:min(70vh,540px);}}',
            '</style>',
            '<div id="maxai-chat-window" aria-live="polite">',
            '<div id="maxai-chat-header">',
            '<div id="maxai-chat-title">Maximised AI Assistant</div>',
            '<button id="maxai-chat-close" type="button" aria-label="Close chat">&times;</button>',
            '</div>',
            '<div id="maxai-chat-messages"></div>',
            '<form id="maxai-chat-form" novalidate>',
            '<input id="maxai-chat-input" type="text" placeholder="Type a message..." autocomplete="off" maxlength="2000" />',
            '<button id="maxai-chat-send" type="submit">Send</button>',
            '</form>',
            '</div>',
            '<button id="maxai-chat-launcher" type="button" aria-label="Open chat">',
            ICON_URL ? '<img src="' + escapeHtml(ICON_URL) + '" alt="" />' : 'AI',
            '</button>'
        ].join('');

        document.body.appendChild(container);

        var windowEl = document.getElementById('maxai-chat-window');
        var launcherEl = document.getElementById('maxai-chat-launcher');
        var closeEl = document.getElementById('maxai-chat-close');
        var formEl = document.getElementById('maxai-chat-form');
        var inputEl = document.getElementById('maxai-chat-input');
        var sendEl = document.getElementById('maxai-chat-send');
        var messagesEl = document.getElementById('maxai-chat-messages');

        var previousResponseId = loadStoredResponseId();
        var isSending = false;

        addMessage(messagesEl, GREETING, 'bot');

        launcherEl.addEventListener('click', function () {
            windowEl.classList.toggle('is-open');
            if (windowEl.classList.contains('is-open')) {
                inputEl.focus();
            }
        });

        closeEl.addEventListener('click', function () {
            windowEl.classList.remove('is-open');
        });

        formEl.addEventListener('submit', function (event) {
            event.preventDefault();

            if (isSending) {
                return;
            }

            var text = (inputEl.value || '').trim();
            if (!text) {
                inputEl.focus();
                return;
            }

            addMessage(messagesEl, text, 'user');
            inputEl.value = '';

            if (isContactIntent(text)) {
                openContactForm();
                addMessage(messagesEl, 'Opening the contact form in a new window now.', 'bot');
                inputEl.focus();
                return;
            }

            setBusy(true);

            var pendingMessage = addMessage(messagesEl, 'Thinking...', 'bot');

            sendMessage(text, previousResponseId)
                .then(function (payload) {
                    pendingMessage.textContent = payload.reply;
                    pendingMessage.className = 'maxai-msg maxai-msg-bot';

                    if (payload.response_id) {
                        previousResponseId = payload.response_id;
                        storeResponseId(previousResponseId);
                    }
                })
                .catch(function (error) {
                    pendingMessage.textContent = error.message || 'The assistant is temporarily unavailable.';
                    pendingMessage.className = 'maxai-msg maxai-msg-bot maxai-msg-error';
                })
                .finally(function () {
                    setBusy(false);
                    inputEl.focus();
                });
        });

        function setBusy(nextState) {
            isSending = nextState;
            inputEl.disabled = nextState;
            sendEl.disabled = nextState;
        }
    }

    function buildContactUrl() {
        try {
            return new URL('/contact-us/', window.location.origin).toString();
        } catch (error) {
            return '/contact-us/';
        }
    }

    function sendMessage(message, previousResponseId) {
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeoutId = window.setTimeout(function () {
            if (controller) {
                controller.abort();
            }
        }, 45000);

        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (REST_NONCE) {
            headers['X-WP-Nonce'] = REST_NONCE;
        }

        return fetch(REST_URL, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: headers,
            body: JSON.stringify({
                message: message,
                previous_response_id: previousResponseId || null
            }),
            signal: controller ? controller.signal : undefined
        })
            .then(function (response) {
                return response.text().then(function (text) {
                    var payload = {};

                    if (text) {
                        try {
                            payload = JSON.parse(text);
                        } catch (error) {
                            throw new Error('The server returned an invalid response.');
                        }
                    }

                    if (!response.ok || !payload.ok) {
                        var errorMessage = payload && payload.error && payload.error.message
                            ? payload.error.message
                            : 'The assistant request failed.';
                        throw new Error(errorMessage);
                    }

                    return payload;
                });
            })
            .catch(function (error) {
                if (error && error.name === 'AbortError') {
                    throw new Error('The assistant took too long to respond.');
                }

                throw error;
            })
            .finally(function () {
                window.clearTimeout(timeoutId);
            });
    }

    function addMessage(messagesEl, text, role) {
        var messageEl = document.createElement('div');
        messageEl.className = 'maxai-msg maxai-msg-' + role;
        messageEl.textContent = text;
        messagesEl.appendChild(messageEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return messageEl;
    }

    function loadStoredResponseId() {
        try {
            return window.sessionStorage.getItem(STORAGE_KEY) || '';
        } catch (error) {
            return '';
        }
    }

    function storeResponseId(value) {
        try {
            window.sessionStorage.setItem(STORAGE_KEY, value);
        } catch (error) {
            return;
        }
    }

    function isContactIntent(message) {
        return CONTACT_INTENT.test(message || '');
    }

    function openContactForm() {
        var newWindow = window.open(CONTACT_URL, '_blank', 'noopener,noreferrer');

        if (newWindow) {
            newWindow.opener = null;
        } else {
            window.location.href = CONTACT_URL;
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }
})();
