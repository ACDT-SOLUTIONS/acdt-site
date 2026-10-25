// legacy.js — script des anciennes pages conservées (navigation mobile, FAQ, événements Plausible).
// Reprend uniquement ces fonctions de l'ancien assets/app.js : le chatbot et l'envoi du formulaire
// vers n8n sont volontairement absents.

function initNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navList = document.querySelector('.nav-list');

    if (!navToggle || !navList) return;

    navToggle.addEventListener('click', () => {
        document.body.classList.toggle('nav-open');
    });

    navList.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            document.body.classList.remove('nav-open');
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
    initPlausibleEvents();
});
