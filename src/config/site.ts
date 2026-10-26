export const site = {
  nom: 'ACDT Solutions',
  description:
    "Automatisation des processus et IA appliquée pour les cabinets d'avocats, les TPE-PME, les artisans et les entreprises de services. Prestations sur devis.",
  email: 'contact@acdt-solutions.com',
  // Ligne professionnelle de l'éditeur (Onoff). À ne pas confondre avec la ligne de démonstration (OVH).
  telephone: '07 57 83 02 79',
  telephoneLien: 'tel:+33757830279',
  locale: 'fr_FR',
} as const;

/**
 * Rendez-vous de découverte. Migration Cal.com → Google Agenda (Google Workspace) :
 * - `google` : URL des deux pages de réservation (même disponibilités, une par modalité). Vides tant qu'elles
 *   n'ont pas été créées ET testées ; ne jamais y mettre une adresse supposée.
 * - Tant que les deux ne sont pas renseignées, le site continue d'utiliser `calcom`.
 * - Une fois la bascule faite et vérifiée en ligne, supprimer `calcom` (voir DEPLOIEMENT.md, section 9).
 */
export const rendezVous = {
  intitule: 'Rendez-vous de découverte — ACDT Solutions',
  duree: '30 minutes',
  jours: 'Du lundi au vendredi',
  plages: ['10h00–12h00', '13h00–16h00'],
  fuseau: 'heure de Paris',
  google: {
    visio: '',
    telephone: '',
  },
  // Page de réservation déjà utilisée par l'ancien site (vérifiée en ligne le 25/10/2026).
  calcom: 'https://cal.com/frederic-ekima-ndemba',
};

const URL_GOOGLE_AGENDA = /^https:\/\/(calendar\.app\.google\/|calendar\.google\.com\/calendar\/appointments\/)/;
for (const [mode, url] of Object.entries(rendezVous.google)) {
  if (url && !URL_GOOGLE_AGENDA.test(url)) {
    throw new Error(`rendezVous.google.${mode} : URL de réservation Google Agenda attendue, reçu « ${url} ».`);
  }
}

/** Vrai quand les deux pages Google Agenda sont renseignées : Cal.com n'est alors plus proposé. */
export const reservationGoogle = Boolean(rendezVous.google.visio && rendezVous.google.telephone);

export interface LienNav {
  label: string;
  href: string;
}

/**
 * Rubriques du menu principal. `sousMenu` désigne la collection qui alimente le menu déroulant
 * (voir Header.astro) : les entrées sont ainsi générées depuis le contenu, sans liste à maintenir.
 */
export interface RubriqueNav extends LienNav {
  sousMenu?: 'solutions' | 'secteurs' | 'cas-pratiques';
}

export const navigationPrincipale: RubriqueNav[] = [
  { label: 'Solutions', href: '/solutions/', sousMenu: 'solutions' },
  { label: 'Secteurs', href: '/secteurs/', sousMenu: 'secteurs' },
  { label: 'Cas pratiques', href: '/cas-pratiques/', sousMenu: 'cas-pratiques' },
  { label: 'Méthode', href: '/methode/' },
  { label: 'Ressources', href: '/ressources/' },
  { label: 'À propos', href: '/a-propos/' },
];

export const ctaPrincipal: LienNav = { label: 'Prendre rendez-vous', href: '/rendez-vous/' };

export const lienEvaluation: LienNav = {
  label: "Évaluer le potentiel d'automatisation",
  href: '/evaluer-le-potentiel/',
};

export const liensLegaux: LienNav[] = [
  { label: 'Mentions légales', href: '/mentions-legales/' },
  { label: 'Confidentialité', href: '/politique-de-confidentialite/' },
  { label: 'Cookies', href: '/politique-cookies/' },
  { label: 'CGU', href: '/conditions-generales-utilisation/' },
  { label: 'CGV', href: '/conditions-generales-vente/' },
];
