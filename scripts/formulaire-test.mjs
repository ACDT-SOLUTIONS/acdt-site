#!/usr/bin/env node
// Endpoint local pour tester le formulaire de contact sans aucun service externe.
// Usage : npm run formulaire:test, puis PUBLIC_FORMULAIRE_URL=http://localhost:8787 npm run dev
// Affiche chaque envoi reçu dans le terminal et répond 200 (ou 500 si le message contient « erreur »).

import { createServer } from 'node:http';

const PORT = 8787;

createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  if (req.method !== 'POST') return res.writeHead(405, cors).end();

  let corps = '';
  req.on('data', (morceau) => (corps += morceau));
  req.on('end', () => {
    console.log(`\n[${new Date().toLocaleTimeString('fr-FR')}] Envoi reçu :\n${corps}`);
    const echec = corps.includes('erreur');
    res.writeHead(echec ? 500 : 200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: !echec }));
  });
}).listen(PORT, () => console.log(`Endpoint de test du formulaire : http://localhost:${PORT}`));
