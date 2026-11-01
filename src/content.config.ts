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

// Niveau d'automatisation d'une étape ou d'une prestation : règles explicites, IA, ou validation par une personne.
const typeEtape = z.enum(['regle', 'ia', 'humain']);
const niveau = z.object({ titre: z.string(), texte: z.string(), exemples: z.array(z.string()).min(1) });

const pagesSolutions = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/pages-solutions' }),
  schema: z.object({
    hero: z.object({
      // Titre éditorial facultatif : le nom de la solution passe alors dans le surtitre.
      titre: z.string().optional(),
      titreAccent: z.string().optional(),
      accroche: z.string(),
      contexte: z.string(),
      promesse: z.string(),
      principal: lien.optional(),
      cta: lien.optional(),
    }),
    problemes: z
      .object({
        titre: z.string(),
        lead: z.string().optional(),
        // `reponse` : ce que l'automatisation change pour ce problème (facultatif).
        items: z.array(titreTexte.extend({ reponse: z.string().optional() })).min(1),
        complement: encadre.optional(),
      })
      .optional(),
    prestations: z
      .object({
        titre: z.string(),
        lead: z.string().optional(),
        // Deux niveaux complémentaires présentés avant les prestations (facultatif).
        niveaux: z.object({ classique: niveau, ia: niveau, note: z.string().optional() }).optional(),
        items: z
          .array(
            z.object({
              titre: z.string(),
              resume: z.string(),
              liste: z.array(z.string()).optional(),
              details: z.array(titreTexte).optional(),
              note: z.string().optional(),
              lien: lien.optional(),
              // Ce que permettent des règles seules, puis ce que l'IA ajoute (facultatifs).
              regles: z.string().optional(),
              ia: z.string().optional(),
            }),
          )
          .min(1),
      })
      .optional(),
    // Simulation interactive d'un processus (fictive) : remplace le schéma d'étapes de « fonctionnement ».
    simulation: z
      .object({
        titre: z.string(),
        lead: z.string(),
        avertissement: z.string(),
        entrees: z.object({ email: z.string(), formulaire: z.string() }),
        email: z.object({
          de: z.string(),
          objet: z.string(),
          // Les informations extraites sont balisées {{cle|texte}} pour être surlignées.
          corps: z.string(),
          pieces: z.array(z.string()),
        }),
        extraction: z.array(
          z.object({ cle: z.string(), label: z.string(), valeur: z.string(), deduit: z.boolean().default(false) }),
        ),
        controles: z.array(z.object({ label: z.string(), ok: z.boolean(), detail: z.string() })),
        dossier: z.object({
          reference: z.string(),
          titre: z.string(),
          statut: z.string(),
          lignes: z.array(z.object({ label: z.string(), valeur: z.string() })),
        }),
        validation: z.object({
          brouillon: z.string(),
          valider: z.string(),
          modifier: z.string(),
          messageModifier: z.string(),
        }),
        suivi: z.array(z.object({ quand: z.string(), action: z.string() })),
        etapes: z
          .array(
            z.object({
              id: z.string(),
              titre: z.string(),
              court: z.string(),
              type: typeEtape,
              texte: z.string(),
              // Variante lorsque la demande arrive par formulaire (ex. étape réalisée sans IA).
              typeFormulaire: typeEtape.optional(),
              texteFormulaire: z.string().optional(),
              utilite: z.string(),
            }),
          )
          .length(6),
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
        // Mention affichée sur chaque carte, ex. « Scénario illustratif » (facultatif).
        badge: z.string().optional(),
        lead: z.string().optional(),
        items: z
          .array(z.object({ secteur: reference('secteurs'), texte: z.string(), etapes: z.array(z.string()).optional() }))
          .min(1),
        conclusion: z.string().optional(),
      })
      .optional(),
    // Indicateurs de suivi d'un processus : méthode de mesure, sans résultat chiffré annoncé.
    mesures: z
      .object({
        eyebrow: z.string().optional(),
        titre: z.string(),
        lead: z.string(),
        // Bénéfices pour le prospect, présentés avant tout chiffre (facultatif).
        benefices: z.array(z.object({ label: z.string(), titre: z.string(), texte: z.string() })).optional(),
        // Mention obligatoire près des chiffres mis en avant : exemples externes, gains non garantis.
        avertissement: z.string().optional(),
        // Zone dépliable regroupant méthode et études complètes.
        sourcesTitre: z.string().optional(),
        methode: z.array(titreTexte).min(2),
        // Texte affiché avant les indicateurs (ex. : nature des exemples présentés).
        introduction: z.string().optional(),
        indicateurs: z
          .array(
            z.object({
              titre: z.string(),
              // Définition générique, affichée seulement sans exemple chiffré.
              mesure: z.string().optional(),
              question: z.string(),
              // Résultat repris en tête de section (2 ou 3 au plus), avec une phrase et une attribution courtes.
              enAvant: z.boolean().default(false),
              // Exemple externe chiffré : une organisation, une source, un niveau de preuve explicite.
              exemple: z
                .object({
                  avant: z.string(),
                  apres: z.string(),
                  unite: z.string(),
                  niveau: z.enum(['mesure', 'estimation', 'calcul', 'fournisseur']),
                  contexte: z.string(),
                  precision: z.string().optional(),
                  resume: z.string().optional(),
                  attribution: z.string().optional(),
                  source: z.object({
                    auteur: z.string().optional(),
                    publication: z.string(),
                    annee: z.number().int().optional(),
                    url: z.url(),
                  }),
                })
                .optional(),
            }),
          )
          .min(1),
        fort: z.string().optional(),
        liens: z.array(lien).optional(),
        conclusion: z.object({ titre: z.string(), texte: z.string().optional(), cta: lien }).optional(),
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

// Sections propres à une page Secteur (un fichier par secteur, nommé d'après son identifiant).
// Sans fichier, la page garde les sections génériques « Cas pratiques » et « Spécificités ».
const hypothese = z
  .object({
    label: z.string(),
    unite: z.string(),
    // Valeur initiale, dans l'unité affichée (pourcentages de 0 à 100).
    valeur: z.number().min(0),
    // Plage du curseur ; la saisie au clavier peut en sortir, dans les limites du moteur.
    curseur: z.object({ min: z.number().min(0), max: z.number(), pas: z.number().positive() }),
    aide: z.string().optional(),
  })
  .refine((h) => h.curseur.min < h.curseur.max && h.valeur >= h.curseur.min && h.valeur <= h.curseur.max, {
    message: 'La valeur initiale doit se trouver dans la plage du curseur.',
  });
const champEconomique = z.object({ label: z.string(), unite: z.string(), aide: z.string().optional() });

const pagesSecteurs = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/pages-secteurs' }),
  schema: z.object({
    valeur: z
      .object({
        eyebrow: z.string(),
        titre: z.string(),
        lead: z.string(),
        simulateur: z.object({
          libelleOnglets: z.string(),
          sansJs: z.string(),
          hypotheses: z.string(),
          avertissement: z.string(),
          reinitialiser: z.string(),
          scenarios: z
            .array(
              z.object({
                id: z.string().regex(/^[a-z0-9-]+$/),
                label: z.string(),
                volume: hypothese,
                minutes: hypothese,
                part: hypothese.refine((h) => h.curseur.max <= 100, { message: 'Un pourcentage ne dépasse pas 100.' }),
              }),
            )
            .min(1),
        }),
        resultats: z.object({
          titre: z.string(),
          libere: z.string(),
          parSemaine: z.string().includes('{valeur}'),
          parSemaineSingulier: z.string().includes('{valeur}'),
          baseSemaine: z.string(),
          actuel: z.string(),
          restant: z.string(),
          // Libellés courts des barres comparatives.
          barres: z.object({ actuel: z.string(), libere: z.string(), restant: z.string() }),
          incomplet: z.string(),
          invalide: z.string(),
          separe: z.string(),
        }),
        economie: z.object({
          titre: z.string(),
          intro: z.string(),
          // Texte affiché dans un champ vide.
          aSaisir: z.string(),
          badgeTheorique: z.string(),
          barres: z.object({ valorisation: z.string(), evitee: z.string(), solde: z.string() }),
          champs: z.object({
            coutHoraireCharge: champEconomique,
            tauxReaffectation: champEconomique,
            coutsRecurrentsMensuels: champEconomique,
            investissementInitial: champEconomique,
            horizonMois: champEconomique,
          }),
          resultats: z.object({
            valorisation: z.string(),
            soldeMensuel: z.string(),
            soldeCumule: z.string(),
            ratio: z.string(),
            delai: z.string(),
            aucunRetour: z.string(),
            sansInvestissement: z.string(),
          }),
          attente: z.object({ valorisation: z.string(), soldeMensuel: z.string(), soldeCumule: z.string() }),
          avertissement: z.string(),
        }),
        // Exemple chiffré à hypothèses fixes, indépendant du simulateur.
        exemple: z.object({
          simulation: reference('simulations'),
          titre: z.string(),
          resume: z.string(),
          detail: z.string(),
          mention: z.string(),
          lien: z.string(),
        }),
        conclusion: z.object({ titre: z.string(), cta: lien }),
      })
      .optional(),
    exigences: z
      .object({ eyebrow: z.string(), titre: z.string(), lead: z.string(), items: z.array(titreTexte).min(1) })
      .optional(),
  }),
});

// Pages légales (src/content/legal/<chemin>.md). `aVerifier` liste les points à traiter avant publication.
const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema: z.object({
    titre: z.string(),
    ordre: z.number(),
    source: z.string().optional(),
    aVerifier: z.array(z.string()).default([]),
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
  pagesSecteurs,
  legal,
  faq,
};
