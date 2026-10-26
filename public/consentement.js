// consentement.js — bannière de consentement et Google Analytics 4 (gtag.js direct, sans Google Tag Manager).
//
// Chargé par toutes les pages (nouvelles et anciennes conservées) : <script defer src="/consentement.js" data-ga4="G-…">.
// - Aucun script Google n'est chargé et aucun cookie _ga n'est déposé tant que le visiteur n'a pas accepté.
// - Le choix (accepté / refusé) est mémorisé 6 mois dans le stockage local du navigateur, puis redemandé.
// - Tout bouton [data-consentement-ouvrir] (pied de page, politique de cookies) rouvre la bannière.
// - Refus ou retrait : GA4 désactivé immédiatement et cookies _ga supprimés.
// Toute modification doit rester cohérente avec src/content/legal/politique-cookies.md.

(() => {
  const script = document.currentScript;
  const ga4 = script && script.dataset.ga4;
  if (!ga4 || !/^G-[A-Z0-9]+$/.test(ga4)) return;

  const CLE = 'acdt-consentement';
  const VERSION = 1;
  const DUREE_CHOIX = 182 * 24 * 3600 * 1000; // 6 mois
  const DUREE_COOKIES = 13 * 30 * 24 * 3600; // 13 mois maximum (recommandation CNIL), en secondes
  const POLITIQUE = '/politique-cookies/';

  let gaCharge = false;
  let banniere = null;
  let declencheur = null;

  function lireChoix() {
    try {
      const v = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (!v || v.version !== VERSION || Date.now() - v.date > DUREE_CHOIX) return null;
      return v.analytics === true || v.analytics === false ? v.analytics : null;
    } catch {
      return null;
    }
  }

  function enregistrerChoix(analytics) {
    try {
      localStorage.setItem(CLE, JSON.stringify({ version: VERSION, analytics, date: Date.now() }));
    } catch {
      // Stockage indisponible (navigation privée stricte) : le choix vaut pour la page en cours.
    }
  }

  function chargerGa() {
    window[`ga-disable-${ga4}`] = false;
    if (gaCharge) {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      return;
    }
    gaCharge = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.gtag('js', new Date());
    window.gtag('config', ga4, {
      cookie_expires: DUREE_COOKIES,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`;
    document.head.appendChild(s);
  }

  function supprimerCookiesGa() {
    const domaines = ['', location.hostname, `.${location.hostname}`];
    const parties = location.hostname.split('.');
    if (parties.length > 2) domaines.push(`.${parties.slice(-2).join('.')}`);
    for (const morceau of document.cookie.split(';')) {
      const nom = morceau.split('=')[0].trim();
      if (!/^_ga(_|$)/.test(nom)) continue;
      for (const d of domaines) {
        document.cookie = `${nom}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`;
      }
    }
  }

  function appliquer(analytics) {
    enregistrerChoix(analytics);
    if (analytics) {
      chargerGa();
    } else {
      window[`ga-disable-${ga4}`] = true;
      if (gaCharge) window.gtag('consent', 'update', { analytics_storage: 'denied' });
      supprimerCookiesGa();
    }
    fermer();
    majEtats();
  }

  function majEtats() {
    const choix = lireChoix();
    const texte = choix === true ? 'acceptée' : choix === false ? 'refusée' : 'aucun choix enregistré';
    for (const el of document.querySelectorAll('[data-consentement-etat]')) el.textContent = texte;
  }

  function styles() {
    const css = `
.acdt-cc{position:fixed;inset:auto 0 0 0;z-index:1000;padding:0 max(1rem,env(safe-area-inset-left)) max(1rem,env(safe-area-inset-bottom));pointer-events:none;font-family:var(--font-sans,system-ui,-apple-system,'Segoe UI',sans-serif)}
.acdt-cc__boite{pointer-events:auto;box-sizing:border-box;max-width:44rem;margin:0 auto;padding:1.25rem 1.5rem;border:1px solid var(--color-line,#e2dcd0);border-radius:var(--radius-l,20px);background:var(--color-surface,#fdfcf9);color:var(--color-text,#14171b);box-shadow:var(--shadow-float,0 30px 60px -30px rgb(20 23 27/.45));font-size:.95rem;line-height:1.5}
.acdt-cc__titre{margin:0 0 .4rem;font-size:1.05rem;font-weight:600}
.acdt-cc__texte{margin:0;color:var(--color-text-muted,#59606a)}
.acdt-cc__texte a{color:inherit;text-decoration:underline}
.acdt-cc__actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem}
.acdt-cc__bouton{flex:1 1 9rem;min-height:2.75rem;padding:.6rem 1.2rem;border:1px solid var(--color-accent,#0f5249);border-radius:999px;background:var(--color-accent,#0f5249);color:var(--color-on-accent,#fdfcf9);font:inherit;font-weight:600;cursor:pointer}
.acdt-cc__bouton:focus-visible{outline:3px solid var(--color-focus,#e5592c);outline-offset:2px}`;
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function ouvrir(source) {
    declencheur = source || null;
    if (!banniere) {
      styles();
      banniere = document.createElement('div');
      banniere.className = 'acdt-cc';
      banniere.innerHTML = `
<section class="acdt-cc__boite" role="dialog" aria-modal="false" aria-labelledby="acdt-cc-titre" aria-describedby="acdt-cc-texte">
  <h2 class="acdt-cc__titre" id="acdt-cc-titre">Mesure d'audience</h2>
  <p class="acdt-cc__texte" id="acdt-cc-texte">Avec votre accord, nous utilisons Google Analytics pour mesurer la fréquentation du site. Aucun cookie publicitaire. Vous pouvez changer d'avis à tout moment depuis le bas de page. <a href="${POLITIQUE}">En savoir plus</a></p>
  <div class="acdt-cc__actions">
    <button type="button" class="acdt-cc__bouton" data-choix="non">Refuser</button>
    <button type="button" class="acdt-cc__bouton" data-choix="oui">Accepter</button>
  </div>
</section>`;
      banniere.addEventListener('click', (e) => {
        const bouton = e.target.closest('[data-choix]');
        if (bouton) appliquer(bouton.dataset.choix === 'oui');
      });
      document.body.appendChild(banniere);
    }
    banniere.hidden = false;
    if (declencheur) banniere.querySelector('button').focus();
  }

  function fermer() {
    if (!banniere) return;
    banniere.hidden = true;
    if (declencheur) declencheur.focus();
    declencheur = null;
  }

  function demarrer() {
    for (const bouton of document.querySelectorAll('[data-consentement-ouvrir]')) {
      bouton.hidden = false;
      bouton.addEventListener('click', () => ouvrir(bouton));
    }
    const choix = lireChoix();
    if (choix === true) chargerGa();
    else if (choix === null) ouvrir();
    majEtats();
  }

  window.acdtConsentement = { ouvrir: () => ouvrir() };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
