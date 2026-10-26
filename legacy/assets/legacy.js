// legacy.js — script des anciennes pages conservées (navigation mobile, FAQ).
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

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initFAQ();
});
