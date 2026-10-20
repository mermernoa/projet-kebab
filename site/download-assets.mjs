#!/usr/bin/env node
/**
 * download-assets.mjs — rapatrie sur le disque les médias générés par Higgsfield
 * (images de section + frame départ/fin + clip vidéo) depuis le CDN CloudFront,
 * aux bons emplacements, en une commande. Supprime l'étape "clic-droit → Enregistrer".
 *
 * Pourquoi : Higgsfield renvoie des URLs CDN, pas des fichiers. Un agent qui a un
 * accès réseau (Claude Code, qui tourne sur ta machine) peut les télécharger seul.
 * Un agent sandboxé sans egress (certains modes Desktop) en est incapable → c'est
 * ce script, lancé côté Claude Code, qui ferme le trou.
 *
 * Zéro dépendance (Node >= 18, `fetch` natif).
 *
 * Usage :
 *   node download-assets.mjs                      # lit ./assets.manifest.json
 *   node download-assets.mjs chemin/mon.json      # manifeste explicite
 *   node download-assets.mjs <url> <dest> [<url> <dest> ...]   # paires en ligne
 *   node download-assets.mjs --force              # re-télécharge même si le fichier existe
 *
 * Manifeste (assets.manifest.json) — array ou objet :
 *   [
 *     { "url": "https://...mp4", "dest": "clip.mp4" },
 *     { "url": "https://...png", "dest": "assets/img/plateau.png" }
 *   ]
 *   ou  { "baseDir": ".", "assets": [ ...mêmes objets... ] }
 *
 * Sortie : un récap OK/ÉCHEC par fichier. Code de sortie != 0 si au moins un échec
 * (pour que l'agent sache qu'il doit relancer / corriger).
 */

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve, isAbsolute, join } from 'node:path';

const MAX_RETRIES = 3;
const CONCURRENCY = 4;
const RETRY_BASE_MS = 800;

// ── arg parsing ──────────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const force = rawArgs.includes('--force');
const args = rawArgs.filter((a) => a !== '--force');

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(2);
}

// ── build the work list {url, dest} ──────────────────────────────────────────
async function loadManifest() {
  // Case 1: inline url/dest pairs (even count, first arg looks like a URL)
  if (args.length >= 2 && /^https?:\/\//i.test(args[0])) {
    if (args.length % 2 !== 0) fail('Paires URL/dest incomplètes (nombre impair d’arguments).');
    const list = [];
    for (let i = 0; i < args.length; i += 2) list.push({ url: args[i], dest: args[i + 1] });
    return { baseDir: '.', assets: list };
  }

  // Case 2: explicit manifest path, else default ./assets.manifest.json
  const manifestPath = resolve(args[0] || 'assets.manifest.json');
  let text;
  try {
    text = await import('node:fs/promises').then((fs) => fs.readFile(manifestPath, 'utf8'));
  } catch {
    fail(
      `Aucun manifeste trouvé (${manifestPath}).\n` +
        `  → Crée un assets.manifest.json, ou passe les paires en ligne :\n` +
        `    node download-assets.mjs "<url>" "assets/img/plateau.png" "<url>" "clip.mp4"`
    );
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    fail(`Manifeste JSON invalide (${manifestPath}) : ${e.message}`);
  }
  const assets = Array.isArray(json) ? json : json.assets;
  const baseDir = (Array.isArray(json) ? '.' : json.baseDir) || '.';
  if (!Array.isArray(assets) || assets.length === 0) {
    fail('Le manifeste ne contient aucun asset ({url, dest}).');
  }
  for (const a of assets) {
    if (!a || typeof a.url !== 'string' || typeof a.dest !== 'string') {
      fail(`Entrée invalide dans le manifeste : ${JSON.stringify(a)} (attendu {url, dest}).`);
    }
  }
  return { baseDir, assets };
}

// ── content sniffing: catch error pages / wrong types served as 200 ──────────
function sniff(dest, buf) {
  const ext = (dest.split('.').pop() || '').toLowerCase();
  const b = buf.subarray(0, 16);
  const head = b.toString('latin1');
  // An HTML/JSON error body returned with status 200 is the classic CDN trap.
  if (head.trimStart().startsWith('<') || head.trimStart().startsWith('{"error'))
    return `réponse texte/HTML (page d’erreur ?) au lieu d’un binaire`;
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const isJpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const isMp4 = buf.subarray(4, 8).toString('latin1') === 'ftyp';
  const isWebp = head.startsWith('RIFF') && buf.subarray(8, 12).toString('latin1') === 'WEBP';
  if (['png'].includes(ext) && !isPng) return `extension .png mais signature non-PNG`;
  if (['jpg', 'jpeg'].includes(ext) && !isJpg) return `extension .jpg mais signature non-JPEG`;
  if (['mp4', 'mov', 'm4v'].includes(ext) && !isMp4) return `extension vidéo mais pas de boîte 'ftyp'`;
  if (['webp'].includes(ext) && !isWebp) return `extension .webp mais signature non-WEBP`;
  return null; // looks fine
}

async function fileExists(p) {
  try {
    const s = await stat(p);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

async function downloadOne({ url, destAbs, dest }) {
  if (!force && (await fileExists(destAbs))) {
    return { dest, status: 'skip', kb: Math.round((await stat(destAbs)).size / 1024) };
  }
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) throw new Error('réponse vide (0 octet)');
      const bad = sniff(dest, buf);
      if (bad) throw new Error(bad);
      const expected = Number(res.headers.get('content-length'));
      if (expected && Math.abs(expected - buf.length) > 0)
        throw new Error(`taille incohérente (attendu ${expected}, reçu ${buf.length})`);
      await mkdir(dirname(destAbs), { recursive: true });
      await writeFile(destAbs, buf);
      return { dest, status: 'ok', kb: Math.round(buf.length / 1024) };
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES) {
        const wait = RETRY_BASE_MS * attempt;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  return { dest, status: 'fail', error: lastErr?.message || 'inconnu' };
}

// ── simple concurrency pool ──────────────────────────────────────────────────
async function runPool(items, worker, limit) {
  const out = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────
const { baseDir, assets } = await loadManifest();
const baseAbs = resolve(baseDir);
const work = assets.map(({ url, dest }) => ({
  url,
  dest,
  destAbs: isAbsolute(dest) ? dest : join(baseAbs, dest),
}));

console.log(`\n⬇  Téléchargement de ${work.length} fichier(s) → ${baseAbs}\n`);

const results = await runPool(work, downloadOne, CONCURRENCY);

let okCount = 0;
let skipCount = 0;
let failCount = 0;
for (const r of results) {
  if (r.status === 'ok') {
    okCount++;
    console.log(`  ✓ ${r.dest}  (${r.kb} Ko)`);
  } else if (r.status === 'skip') {
    skipCount++;
    console.log(`  • ${r.dest}  (déjà présent, ${r.kb} Ko — --force pour écraser)`);
  } else {
    failCount++;
    console.log(`  ✖ ${r.dest}  → ${r.error}`);
  }
}

console.log(
  `\n${failCount === 0 ? '✅' : '⚠️ '} ${okCount} téléchargé(s), ${skipCount} ignoré(s), ${failCount} échec(s).\n`
);

if (failCount > 0) {
  console.log(
    'Astuce : un échec "page d’erreur / HTTP 4xx" signifie souvent une URL CDN expirée\n' +
      '(re-génère ou récupère une URL fraîche), ou un agent sans accès internet\n' +
      '(lance ce script depuis Claude Code, qui tourne sur ta machine).\n'
  );
  process.exit(1);
}
