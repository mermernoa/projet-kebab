# Starter — site cinématique à fly-through

Un squelette de site propre, neutre et réutilisable. Le cœur est un **hero en fly-through** : une vidéo générée par IA, découpée en images, que le **scroll** fait défiler image par image (effet « scrub » façon Apple). Le reste de la page (stats, sections éditoriales, features, contact) est prêt à être habillé avec **ton** business.

Tu ne codes pas : tu pilotes Claude Code, qui remplit la copy et le design. Ce README couvre la seule manip manuelle : **brancher tes frames**.

---

## Mise en route en 4 gestes

1. **Pose tes frames.** Exporte ton vol IA en images JPEG et glisse-les dans `assets/frames/`, nommées exactement :
   ```
   frame-001.jpg
   frame-002.jpg
   frame-003.jpg
   ...
   ```
   (numérotation sur 3 chiffres, qui commence à `001`, sans trou dans la suite).

2. **Dis combien il y en a.** Ouvre `index.html`, trouve la section `.scrub` et mets le nombre exact de frames dans `data-frames` :
   ```html
   <section class="scrub" id="hero" data-frames="120"> <!-- 120 = ton nombre réel -->
   ```

3. **Lance un serveur local** (les frames ne se chargent pas en ouvrant le fichier en `file://`) :
   ```bash
   npx serve                       # ouvre l'URL affichée, souvent http://localhost:3000
   # OU
   python -m http.server 4188      # puis http://localhost:4188
   ```
   > Au **tout premier** `npx serve`, npm demande `Ok to proceed? (y)` pour installer le paquet : tape **`y`** puis Entrée. Ce n'est pas une erreur, c'est l'installation normale (une seule fois). Sous Windows, si tu préfères éviter cette invite, `python -m http.server 4188` ne demande rien.
   Ouvre l'URL **dans ton navigateur et regarde** : tu valides à l'œil. (Le GUIDE utilise `http://localhost:4188` comme exemple — peu importe le port, c'est celui que ta commande affiche.)

4. **Scrolle.** Le vol doit se dérouler en fondu, image par image, du haut vers le bas de la section hero.

> À chaque fois que tu **remplaces** les frames, incrémente `CACHE_BUST` (en haut de `script.js`) de 1, sinon le navigateur peut resservir les anciennes images en cache.
>
> ⚠️ **`CACHE_BUST` ne busté QUE les frames.** Si tu (ou Claude Code) modifies `style.css` ou `script.js`, c'est un cache à part : incrémente à la main le `?v` de leurs balises dans `index.html` (`style.css?v=1` → `?v=2`, `script.js?v=1` → `?v=2`). Sinon le navigateur sert l'ancien fichier et tu crois que ta modif n'a pas pris.

> **État par défaut au 1er serve (normal, pas un bug).** Le starter ship avec **une frame de démo** (`assets/frames/frame-001.jpg`, un dégradé neutre) et `data-frames="1"`, sur un hero volontairement court (`.scrub { height: 160vh }`). Tu verras donc un dégradé fixe, pas encore un vol. Dès que tu poses tes vraies frames et mets `data-frames` + la hauteur à jour (étape 2 et « Régler la vitesse »), le hero s'anime.
>
> 🔴 **Les sections affichent des images-placeholders neutres au 1er serve** — deux dégradés sombres câblés par défaut : `placeholder-1.jpg` dans le bloc éditorial (présentation) et `placeholder-2.jpg` dans le full-bleed. **C'est normal** : ce ne sont pas tes vraies photos. Tu les remplaceras à l'**étape 4 bis du GUIDE** (génère 1 image par section sur Higgsfield) — pas à la main : demande à Claude Code de brancher chaque image. Tant que tu ne l'as pas fait, les sections gardent ces dégradés — ce n'est pas un bug.
>
> 💡 Si tu retires un placeholder sans le remplacer (src cassé), le bloc éditorial retombe sur un **fallback texturé** avec le label « Image à venir » — un filet de sécurité pour ne jamais afficher un trou noir.

---

## Les légendes (« beats ») du hero

Les blocs `.scrub__beat` dans `index.html` portent des attributs `data-in` / `data-out` (position dans le scroll, de 0 = début à 1 = fin du vol). Une légende est visible entre son `data-in` et son `data-out`, puis disparaît en fondu.

> **Les plages « sans légende » sont volontaires, pas un bug.** Par défaut le starter laisse respirer le vol entre les beats (ex. rien entre 48 % et 62 % du scroll) : on voit alors la vidéo seule, sans texte. C'est un choix de rythme. Tu **cales ces fenêtres à l'œil à l'étape 5**, une fois tes vraies frames posées : scrolle lentement, repère où la caméra arrive sur chaque temps fort, et ajuste `data-in` / `data-out` pour que chaque légende tombe au bon moment. Si tu veux zéro respiration, fais se toucher les fenêtres (`data-out` d'un beat = `data-in` du suivant).

---

## Régler la vitesse du vol

La hauteur de la section hero détermine la vitesse. Dans `style.css` :

```css
.scrub { height: 560vh; }
```

Point de départ : **`hauteur_vh ≈ nombre_de_frames × 4.6`**. Puis **juge à l'œil** :

- vol **trop rapide** (images qui sautent) → monte vers `× 6` ;
- vol **trop lent** (il faut scroller une éternité) → descends vers `× 3`.

Scrolle, regarde, ajuste. Il n'y a pas de bonne valeur unique — seule la sensation compte.

---

## Habiller le site (copy + design)

- **Charte graphique** : tout se règle dans le bloc `:root` en haut de `style.css` (couleurs, accent, polices, largeur, espacement). C'est le seul endroit à toucher pour reskinner toute la page. Les valeurs de départ sont **neutres** exprès.
- **Polices** : ajoute un `<link>` Google Fonts dans `index.html` puis reporte les noms dans `--serif` / `--sans`.
- **Copy** : tous les textes entre `[crochets]` dans `index.html` sont des placeholders à remplacer.
- **Images de section** : le starter ship **2 emplacements image** câblés par défaut sur des placeholders neutres — `assets/img/placeholder-1.jpg` (bloc éditorial « présentation ») et `assets/img/placeholder-2.jpg` (full-bleed) — pour que les sections s'affichent dès le premier serve. 🔴 **Ils doivent être remplacés** : ce sont des dégradés sombres, pas de vraies photos. Génère **une image distincte par emplacement** (étape 4 bis du GUIDE — texte→image sur Higgsfield, cohérente avec ta charte), dépose-les dans `assets/img/` et **demande à Claude Code de brancher chaque image** (il change le `src`) — tu ne touches pas le HTML toi-même. 🔴 **Une image par section, jamais le même fichier réutilisé sur deux sections.** Les balises gardent `width`/`height` pour éviter les sauts de mise en page. Si tu ajoutes des sections (Claude le fait sur demande), compte **1 image par bloc image ajouté**.

---

## Ce qu'il y a dans le dossier

```
starter/
├── index.html          squelette de sections nommées + copy placeholder
├── style.css           :root = ta charte · le reste = structure + motion
├── script.js           moteur scroll-scrub (zéro dépendance, ne pas éditer)
├── download-assets.mjs récupère auto les fichiers Higgsfield (CDN → disque), voie MCP
├── assets/
│   ├── frames/         frame-001.jpg = frame de démo (dégradé) · remplace par TES frames
│   └── img/            placeholder-1.jpg + placeholder-2.jpg = visuels neutres · remplace par TES images
└── README.md           ce fichier
```

> **`download-assets.mjs`** (voie MCP / Claude Code uniquement) : en voie UI web tu
> télécharges tes fichiers à la main ; en MCP, Claude Code les rapatrie tout seul
> depuis le CDN Higgsfield avec ce script (`node download-assets.mjs`, lit un
> `assets.manifest.json` de paires `{url, dest}`). Tu n'as jamais à l'appeler
> toi-même — Claude Code s'en sert. Détail : skill `cinematic-site-flythrough` §4.4 bis.

C'est volontairement **vanilla** (HTML + CSS + JS, aucune dépendance, aucun build). Ça tourne avec n'importe quel serveur statique et se déploie tel quel sur Netlify, Vercel ou GitHub Pages.
