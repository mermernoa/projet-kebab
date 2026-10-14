# Kebab Studio : site vitrine 3D

Site vitrine en une page : au scroll, on visite le restaurant en 3D réaliste, comme si on y entrait.

1. **La rue** : une vraie ruelle (photo HDR 360°) ; la devanture du Kebab Studio apparaît sur la droite.
2. **La devanture** : vitrines, porte vitrée, caisson lumineux avec le logo, enseigne ronde, chevalet.
3. **L'entrée** : la porte s'ouvre, on découvre le comptoir à gauche et la salle à droite.
4. **La broche**, puis **le pain et les crudités**, puis **les sauces et toppings**, le long du comptoir.
5. **La salle** : banquette en cuir, tabourets colorés, néon « Good Food Good Vibes », frigo à boissons.
6. **Ton kebab** : le menu servi sur la table, avec les liens de commande.
7. **Infos pratiques** : adresse, horaires, contact.

Le rendu vise le réalisme : éclairage par photos HDR (rue dehors, café dedans), matières PBR
(carrelage, inox brossé, terrazzo, cuir, bois), occlusion ambiante, profondeur de champ, halo des
lumières et grain de pellicule. La caméra suit une seule trajectoire continue et amortie, et la
résolution s'adapte automatiquement si l'appareil ralentit.

## Lancer le site

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # génère le dossier dist/
npm run preview   # sert dist/ pour vérifier la version finale
```

## Mettre en ligne

**Site en ligne : https://mermernoa.github.io/projet-kebab/**

Le workflow `.github/workflows/pages.yml` publie le site sur GitHub Pages à chaque push sur `main` ou sur la
branche de travail `claude/tender-dijkstra-7xrlxt`. À activer une seule fois dans
**Settings → Pages → Build and deployment → Source : GitHub Actions**.

Le dossier `dist/` est un site statique : il se dépose tel quel sur Netlify, Vercel, OVH, o2switch,
GitHub Pages, etc. (les chemins sont relatifs, il fonctionne aussi dans un sous-dossier).

- **Netlify / Vercel** : commande de build `npm run build`, dossier publié `dist`.
- **Hébergement classique (FTP)** : lancer `npm run build`, puis envoyer le contenu de `dist/`.

## À compléter avant la mise en ligne

Les informations pratiques sont des **exemples**. Elles sont signalées par `À COMPLÉTER` dans
`index.html` :

| Information | Où |
|---|---|
| Adresse | section `#infos` + bloc JSON-LD dans le `<head>` |
| Horaires | section `#infos` + JSON-LD (`openingHoursSpecification`) |
| Téléphone, e-mail | section `#infos` + JSON-LD (`telephone`) |
| Liens Instagram, TikTok | section `#infos` |
| Liens Uber Eats / Deliveroo | section `#commander` |
| Lien « Mentions légales » | pied de page |
| Image de partage | `og:image` : mettre l'URL complète une fois le domaine connu (ex. `https://kebabstudio.fr/og-image.jpg`) |

Les légendes de la visite sont dans `index.html`. Les écrans de menu du comptoir en 3D se modifient dans
`src/world/paint.js` (`MENU`), et les couleurs des sauces dans `src/world/food.js` (`SAUCES`).

## Charte graphique

- Couleurs : `#000000`, `#FACA2C`, `#F88DBF`, `#F74A28`, `#9251E5` (+ le vert et le bleu du logo),
  définies dans `src/styles.css` (`:root`) et `src/world/paint.js` (`BRAND`).
- Titres : Anton, proche des lettres du logo, pour les très grands titres. Textes : Poppins. Ardoise :
  Permanent Marker. Néon : Sacramento. La police de la charte, **TAN Headline**, est sous licence et
  n'est pas fournie : pour l'utiliser, déposer `TAN-Headline.woff2` dans `public/fonts/`, décommenter le
  bloc `@font-face` en haut de `src/styles.css` et l'ajouter en tête de `--font-display`.
  Toutes les polices sont auto-hébergées : aucun appel à Google Fonts au chargement de la page.

## Comment c'est construit

```
index.html            contenu, légendes de la visite, SEO
src/main.js           chargement, boucle de rendu, scroll → caméra, qualité adaptative
src/tour/path.js      les plans de la visite (position, cible, focale, variante mobile)
src/world/layout.js   plan de la boutique (cotes en mètres)
src/world/env.js      photos HDR : rue projetée au sol, reflets du café
src/world/street.js   devanture
src/world/interior.js salle, comptoir, éclairage, modèles 3D
src/world/food.js     broches, pain, crudités, sauces, toppings, menu servi
src/world/pbr.js      matières réalistes générées en code (couleur, relief, brillance)
src/world/paint.js    enseignes, ardoise, néon, écrans de menu
src/world/post.js     rendu caméra (occlusion, bloom, profondeur de champ, AgX, grain)
public/env, public/models   photos HDR et modèles 3D
```

- Pour recadrer un moment de la visite, modifier son plan dans `src/tour/path.js`.
- Pour rallonger ou raccourcir la visite, changer la hauteur de `#tour` dans `src/styles.css`.
- Les textes des légendes sont dans `index.html` (`<section class="cap" data-key="…">`, la clé est le
  numéro du plan).
- Sans WebGL, une photo de la façade remplace la scène et le contenu reste accessible. Avec « réduire
  les animations », la caméra passe d'un plan à l'autre sans trajet.

## Crédits des ressources 3D (affichés en pied de page)

| Ressource | Source | Licence |
|---|---|---|
| Photo HDR de rue « Urban Alley 01 » | Poly Haven | CC0 |
| Photo HDR « Comfy Cafe » (reflets intérieurs) | Poly Haven | CC0 |
| Frigo à boissons « Commercial Refrigerator » | Sean Thomas, Eric Chadwick (Khronos glTF Sample Assets) | CC BY 4.0 |
| Appliques « Anisotropy Barn Lamp » | Wayfair, Eric Chadwick (Khronos glTF Sample Assets) | CC BY 4.0 |
| Plantes « Diffuse Transmission Plant » | Rico Cilliers, Eric Chadwick (Khronos glTF Sample Assets) | CC0 / CC BY 4.0 |

Le reste (bâtiment, mobilier, nourriture, matières) est modélisé et texturé en code.
