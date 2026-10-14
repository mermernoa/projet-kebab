# Kebab Studio : site vitrine 3D

Site vitrine en une page : au scroll, la caméra fait la visite du restaurant en 3D.

1. **Accueil** : la broche arc-en-ciel du logo tourne, puis s'envole vers l'enseigne.
2. **La façade** : vitrine noire, taches de couleur, ardoise des 5 étapes, chevalet « Ici, c'est toi le chef ! ».
3. **L'entrée** : les portes automatiques s'ouvrent, on découvre le comptoir.
4. **Les 5 stations du comptoir**, une par recoin : ton pain, ta viande (broches qui tournent), ta garniture, ta sauce, ton topping.
5. **La salle** : banquette jaune, tabourets colorés, néon « Good Food Good Vibes ».
6. **Ton kebab** : le menu servi sur la table, avec les liens de commande.
7. **Infos pratiques** : adresse, horaires, contact, réseaux.

Toute la boutique est modélisée en code (Three.js) : pas de fichier 3D externe. Le site reste léger,
environ 1,3 Mo, polices comprises.

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

Les textes des stations (choix de pains, viandes, sauces…) sont aussi dans `index.html`. Les mêmes
listes apparaissent sur les écrans du comptoir en 3D : elles se modifient dans
`src/three/textures.js` (`SCREEN_ITEMS`), et les noms des sauces dans `src/three/stations.js` (`SAUCES`).

## Charte graphique

- Couleurs : `#000000`, `#FACA2C`, `#F88DBF`, `#F74A28`, `#9251E5` (+ le vert et le bleu du logo),
  définies dans `src/styles.css` (`:root`) et `src/three/palette.js`.
- Titres : **TAN Headline** est une police sous licence, non fournie. En attendant, le site utilise
  *Lilita One*, proche en graisse et en esprit. Pour activer TAN Headline, déposer
  `TAN-Headline.woff2` dans `public/fonts/` et décommenter le bloc `@font-face` en haut de
  `src/styles.css`.
- Textes : Poppins. Lettres sur papier coloré : Anton. Écriture à la main : Permanent Marker.
  Toutes les polices sont auto-hébergées : aucun appel à Google Fonts au chargement de la page.

## Comment c'est construit

```
index.html              contenu et SEO (une <section class="stop"> par arrêt de la visite)
src/main.js             rendu, boucle d'animation, liaison scroll ↔ caméra
src/tour/path.js        arrêts de la caméra (position, cible, focale, poses mobiles)
src/tour/scroll.js      découpage du scroll en arrêts et trajets
src/three/world.js      scène, lumières, animation de la broche, des portes et des projecteurs
src/three/storefront.js façade et trottoir
src/three/interior.js   salle, comptoir, écrans, néon
src/three/stations.js   les 5 stations du comptoir
src/three/kebab.js      broche arc-en-ciel, broches de viande, menu final
src/three/textures.js   textures peintes en code (enseigne, ardoises, écrans, néon, affiches)
```

- Chaque section de `index.html` porte `data-stop` (l'arrêt de caméra) et `data-len` (sa longueur de
  scroll, en % de hauteur d'écran). Pour rallonger ou raccourcir une étape, changer `data-len`.
- Pour recadrer une étape, modifier sa pose dans `src/tour/path.js`.
- **Mobile** : même visite, avec un cadrage adapté. Les cartes passent en bas de l'écran et la brochette
  de progression devient horizontale.
- **Accessibilité** : navigation clavier, lien d'évitement vers les infos, contenu lisible sans 3D. Avec
  « réduire les animations » activé, la caméra passe d'un arrêt à l'autre sans trajet.
- Sans WebGL, une photo de la façade remplace la scène et tout le contenu reste accessible.
