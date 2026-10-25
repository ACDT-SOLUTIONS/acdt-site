export const site = {
  nom: 'ACDT Solutions',
  description:
    "Automatisation des processus et IA appliquée pour les cabinets d'avocats, les TPE-PME, les artisans et les entreprises de services. Prestations sur devis.",
  email: 'contact@acdt-solutions.com',
  locale: 'fr_FR',
} as const;

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
  { label: 'Confidentialité', href: '/confidentialite/' },
  { label: 'Cookies', href: '/cookies/' },
  { label: 'CGV', href: '/cgv/' },
];
