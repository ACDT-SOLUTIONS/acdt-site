import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { PARAMETRES } from './lib/roi/engine';

const solutions = defineCollection({
  loader: file('src/content/solutions.yaml'),
  schema: z.object({
    numero: z.string(),
    titre: z.string(),
    accroche: z.string(),
    description: z.string(),
    capacites: z.array(z.string()).min(1),
    flux: z.array(z.object({ etape: z.string(), detail: z.string() })).length(3),
    // « sous-reserve » : présenté sans être affiché comme commercialisable en l'état.
    statut: z.enum(['disponible', 'sous-reserve']),
    mention: z.string().optional(),
  }),
});

const capacites = defineCollection({
  loader: file('src/content/capacites.yaml'),
  schema: z.object({ titre: z.string(), description: z.string() }),
});

const secteurs = defineCollection({
  loader: file('src/content/secteurs.yaml'),
  schema: z.object({
    nom: z.string(),
    accroche: z.string(),
    problemes: z.array(z.string()).min(1),
    familles: z.array(reference('solutions')),
    statut: z.enum(['lancement', 'en-preparation']),
    // Une page n'est générée que si `publie` est vrai (ex. santé, en attente de validation).
    publie: z.boolean().default(true),
    mention: z.string().optional(),
    ordre: z.number(),
  }),
});

const etapesFlux = z.array(z.object({ etape: z.string(), detail: z.string() })).min(2);

const problemes = defineCollection({
  loader: file('src/content/problemes.yaml'),
  schema: z.object({
    titre: z.string(),
    description: z.string(),
    famille: reference('solutions'),
    ordre: z.number(),
  }),
});

const sources = defineCollection({
  loader: file('src/content/sources.yaml'),
  schema: z
    .object({
      titre: z.string(),
      editeur: z.string(),
      url: z.url().optional(),
      consulteLe: z.iso.date().optional(),
      statut: z.enum(['verifiee', 'a-verifier']),
      note: z.string(),
    })
    // Une source ne peut être déclarée vérifiée sans lien ni date de consultation.
    .refine((s) => s.statut !== 'verifiee' || (s.url && s.consulteLe), {
      message: 'Une source vérifiée exige une URL et une date de consultation.',
    }),
});

const parametre = (cle: keyof typeof PARAMETRES) =>
  z.number().min(PARAMETRES[cle].min).max(PARAMETRES[cle].max);

const simulations = defineCollection({
  loader: file('src/content/simulations.yaml'),
  schema: z.object({
    titre: z.string(),
    secteur: reference('secteurs'),
    famille: reference('solutions'),
    contexte: z.string(),
    // Facultatifs : la page affiche un emplacement « à rédiger » tant qu'ils sont absents.
    processusActuel: etapesFlux.optional(),
    processusAutomatise: etapesFlux.optional(),
    parametres: z.object({
      occurrencesParMois: parametre('occurrencesParMois'),
      minutesParOccurrence: parametre('minutesParOccurrence'),
      tauxAutomatisation: parametre('tauxAutomatisation'),
      coutHoraireCharge: parametre('coutHoraireCharge'),
      tauxReaffectation: parametre('tauxReaffectation'),
      coutsRecurrentsMensuels: parametre('coutsRecurrentsMensuels'),
      investissementInitial: parametre('investissementInitial'),
      horizonMois: parametre('horizonMois'),
    }),
    // Chaque paramètre doit dire d'où il vient : hypothèse de travail ou source externe.
    justifications: z.record(
      z.enum(Object.keys(PARAMETRES) as [keyof typeof PARAMETRES, ...(keyof typeof PARAMETRES)[]]),
      z.object({
        origine: z.enum(['hypothese', 'source']),
        note: z.string(),
        source: reference('sources').optional(),
      }),
    ),
    limites: z.array(z.string()).min(1),
    miseEnAvant: z.boolean().default(false),
  }),
});

// Rédaction détaillée d'une page Solution (un fichier par famille, nommé d'après son identifiant).
// Toutes les sections sont facultatives : celles qui manquent restent en « À rédiger ».
const lien = z.object({ label: z.string(), href: z.string() });
const titreTexte = z.object({ titre: z.string(), texte: z.string() });
const encadre = z.object({ titre: z.string().optional(), texte: z.array(z.string()).min(1), fort: z.string().optional() });

const pagesSolutions = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/pages-solutions' }),
  schema: z.object({
    hero: z.object({ accroche: z.string(), contexte: z.string(), promesse: z.string(), cta: lien.optional() }),
    problemes: z
      .object({ titre: z.string(), lead: z.string().optional(), items: z.array(titreTexte).min(1), complement: encadre.optional() })
      .optional(),
    prestations: z
      .object({
        titre: z.string(),
        lead: z.string().optional(),
        items: z
          .array(
            z.object({
              titre: z.string(),
              resume: z.string(),
              liste: z.array(z.string()).optional(),
              details: z.array(titreTexte).optional(),
              note: z.string().optional(),
              lien: lien.optional(),
            }),
          )
          .min(1),
      })
      .optional(),
    modes: z
      .object({
        titre: z.string(),
        items: z.array(z.object({ id: z.string(), label: z.string(), declencheur: z.string(), texte: z.string() })).min(2),
        note: z.string().optional(),
      })
      .optional(),
    fonctionnement: z
      .object({ titre: z.string(), lead: z.string().optional(), etapes: z.array(titreTexte).min(2), conclusion: z.string().optional() })
      .optional(),
    demo: z
      .object({
        titre: z.string(),
        accroche: z.string(),
        intro: z.string(),
        numero: z.string(),
        tel: z.string().regex(/^tel:\+\d+$/),
        scenario: z.object({ titre: z.string(), texte: z.array(z.string()).min(1) }),
        duree: z.string(),
        avertissement: z.string(),
        etapes: z.array(z.string()).min(1),
        remarque: z.string().optional(),
        suite: z.object({ texte: z.string(), cta: lien }),
      })
      .optional(),
    benefices: z
      .object({
        titre: z.string(),
        items: z.array(z.object({ label: z.string(), titre: z.string(), texte: z.string() })).min(1),
        evaluation: encadre.optional(),
      })
      .optional(),
    secteurs: z
      .object({
        titre: z.string(),
        items: z.array(z.object({ secteur: reference('secteurs'), texte: z.string() })).min(1),
        conclusion: z.string().optional(),
      })
      .optional(),
    accompagnement: z
      .object({
        titre: z.string(),
        etapes: z.array(titreTexte).min(2),
        devis: z.object({ titre: z.string(), facteurs: z.array(z.string()).min(1), texte: z.string() }).optional(),
      })
      .optional(),
    confidentialite: z
      .object({
        titre: z.string(),
        sousTitre: z.string(),
        points: z.array(z.object({ label: z.string(), texte: z.string() })).min(1),
      })
      .optional(),
    cta: z.object({ titre: z.string(), texte: z.string(), principal: lien.optional(), secondaire: lien }).optional(),
  }),
});

const faq = defineCollection({
  loader: file('src/content/faq.yaml'),
  schema: z.object({
    question: z.string(),
    reponse: z.string(),
    // Chemins des pages où la question apparaît, ex. '/methode/' ou '/solutions/infrastructure-privee/'.
    pages: z.array(z.string().regex(/^\/(.+\/)?$/)),
    ordre: z.number(),
  }),
});

export const collections = {
  solutions,
  capacites,
  secteurs,
  problemes,
  sources,
  simulations,
  pagesSolutions,
  faq,
};
