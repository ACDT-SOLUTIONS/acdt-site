// app.js — navigation, FAQ, formulaire, chat, tracking basique


const N8N_FORM_WEBHOOK_URL = 'https://n8n.acdt-solutions.com/webhook/dd6d8a34-f999-4fa7-8088-0d654fe535fe';
const N8N_CHAT_WEBHOOK_URL = 'https://n8n.acdt-solutions.com/webhook/62db55e2-ffd4-4938-bc80-e53bd0f66d30';
const CHAT_HISTORY_KEY = 'acdt_chat_history';
let chatHistory = [];
const HISTORY_LIMIT = 8; 

function loadChatHistory() {
    try {
        const raw = sessionStorage.getItem(CHAT_HISTORY_KEY);
        chatHistory = raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn('Impossible de charger le chat history', e);
        chatHistory = [];
    }
}

function saveChatHistory() {
    try {
        sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    } catch (e) {
        console.warn('Impossible de sauvegarder le chat history', e);
    }
}

function renderChatHistory(messagesEl) {
    messagesEl.innerHTML = '';
    chatHistory.forEach((msg) => {
        const div = document.createElement('div');
        div.className = msg.role === 'user' ? 'user' : 'bot';
        div.textContent = msg.content;
        messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function initNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navList = document.querySelector('.nav-list');

    if (!navToggle || !navList) return;

    navToggle.addEventListener('click', () => {
        const isOpen = document.body.classList.toggle('nav-open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    
    navList.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            document.body.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.body.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });
}

function initFAQ() {
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach((btn) => {
        btn.addEventListener('click', () => {
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            const answer = btn.nextElementSibling;
            btn.setAttribute('aria-expanded', String(!expanded));
            if (answer) {
                answer.hidden = expanded;
            }
        });
    });
}

function initForms() {
    const forms = document.querySelectorAll('form[data-form-id]');
    if (!forms.length) return;

    forms.forEach((form) => {
        const submitBtn = form.querySelector('button[type="submit"]');
        const feedbackEl = form.querySelector('.form-feedback');
        const honeypot = form.querySelector('input[name="website"]');

        function validateForm() {
            const requiredFields = form.querySelectorAll('[required]');
            let valid = true;
            requiredFields.forEach((field) => {
                if (!field.value.trim()) valid = false;
            });
            if (submitBtn) submitBtn.disabled = !valid;
        }

        form.addEventListener('input', validateForm);
        validateForm();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (honeypot && honeypot.value.trim() !== '') {
                return;
            }
            if (!submitBtn) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Envoi...';
            if (feedbackEl) {
                feedbackEl.textContent = '';
            }

            const formData = new FormData(form);
            const payload = {};
            formData.forEach((value, key) => {
                payload[key] = value;
            });
            payload.formId = form.dataset.formId;

            try {
                
                if (!N8N_FORM_WEBHOOK_URL) {
                    throw new Error('URL Webhook Formulaire non configurée');
                }

                const res = await fetch(N8N_FORM_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    throw new Error('Erreur serveur');
                }

                form.reset();
                validateForm();
                submitBtn.textContent = 'Envoyer';
                if (feedbackEl) {
                    feedbackEl.textContent = 'Merci, votre message a bien été envoyé.';
                }
            } catch (err) {
                console.error(err);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Envoyer';
                if (feedbackEl) {
                    feedbackEl.textContent = 'Une erreur est survenue, merci de réessayer.';
                }
            }
        });
    });
}

function initChat() {
    const toggle = document.getElementById('chat-toggle');
    const panel = document.getElementById('chat-panel');
    const closeBtn = document.getElementById('chat-close');

    if (!toggle || !panel) return;

    function openChat() {
        panel.setAttribute('aria-hidden', 'false');
    }

    function closeChat() {
        panel.setAttribute('aria-hidden', 'true');
    }

    toggle.addEventListener('click', () => {
        const hidden = panel.getAttribute('aria-hidden') !== 'false';
        hidden ? openChat() : closeChat();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeChat);
    }

    
    const chatForm = panel.querySelector('form');
    const inputField = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');

    if (!chatForm || !inputField || !messages) return;

    
    loadChatHistory();
    renderChatHistory(messages);

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = inputField.value.trim();
        if (!message) return;

        
        const historyForN8N = chatHistory.slice(-HISTORY_LIMIT); 
        
        
        chatHistory.push({ role: 'user', content: message });
        saveChatHistory(); 

        const userMsg = document.createElement('div');
        userMsg.className = 'user';
        userMsg.textContent = message;
        messages.appendChild(userMsg);
        messages.scrollTop = messages.scrollHeight;

        inputField.value = '';

        
        const typing = document.createElement('div');
        typing.className = 'bot';
        typing.textContent = '...';
        messages.appendChild(typing);
        messages.scrollTop = messages.scrollHeight;

        try {
            if (!N8N_CHAT_WEBHOOK_URL) {
                throw new Error('Webhook de chat non configuré');
            }

            
            const payload = {
                message: message, 
                history: historyForN8N, 
                pagePath: window.location.pathname,
                pageTitle: document.title,
            };

            const res = await fetch(N8N_CHAT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const text = await res.text();
            console.log('Chat raw response:', res.status, text);

            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            let data = {};
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error('JSON parse error', err);
                throw err;
            }

            typing.remove();

            const reply = data.reply || 'Merci, j’ai bien reçu votre message.';
            const botMsg = document.createElement('div');
            botMsg.className = 'bot';
            botMsg.textContent = reply;
            messages.appendChild(botMsg);
            messages.scrollTop = messages.scrollHeight;

            
            chatHistory.push({ role: 'assistant', content: reply });
            saveChatHistory();
        } catch (err) {
            console.error('Chat error:', err);
            typing.remove();

            const errorMsg = document.createElement('div');
            errorMsg.className = 'bot';
            errorMsg.textContent = "Désolé, une erreur est survenue. Vous pouvez aussi passer par le formulaire de contact.";
            messages.appendChild(errorMsg);
            messages.scrollTop = messages.scrollHeight;

            chatHistory.push({ role: 'assistant', content: errorMsg.textContent });
            saveChatHistory();
        }
    });
}
function initPlausibleEvents() {
    if (!window.plausible) return;
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('[data-event]');
        if (!target) return;
        const eventName = target.getAttribute('data-event');
        const props = {};
        Array.from(target.attributes).forEach((attr) => {
            if (attr.name.startsWith('data-') && attr.name !== 'data-event') {
                const key = attr.name.replace('data-', '');
                props[key] = attr.value;
            }
        });
        window.plausible(eventName, { props });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initFAQ();
    initForms();
    initChat();
    initPlausibleEvents();
});