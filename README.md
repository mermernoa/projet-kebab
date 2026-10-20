# Kebab Studio — site cinématique (visite virtuelle)

Site one-page qui fait visiter le futur restaurant Kebab Studio (rue des Trois-Cailloux, Amiens) :
la rue → la devanture → le seuil (hero au scroll), puis 5 stations, le configurateur « Crée ton kebab »,
les engagements, les infos pratiques.

- `BRIEF.md` — le brief validé (offre, charte, hero, plan visuel)
- `COPY.md` — tous les textes validés
- `site/` — le site (HTML/CSS/JS vanilla) : `index.html` = visite par stations, `visite.html` = visite en plan-séquence (caméra continue au scroll + bouton « Lancer la visite », `sequence.js` / `sequence.css`). Lancer : `cd site && python3 -m http.server 4188` puis http://localhost:4188 (jamais en `file://`)
- `sources/` — visuels d'origine

État : hero en **plan B** (zoom sur la façade d'origine) et photos de stations provisoires (recadrages des rendus),
en attendant les générations Higgsfield.

## Déploiement

Le workflow `.github/workflows/pages.yml` publie le site sur GitHub Pages (https://mermernoa.github.io/projet-kebab/)
à chaque push sur `main` ou sur la branche de travail `claude/clever-feynman-gpocb9`.

**Sauvegarde** : la visite 3D d'avant (branche `claude/tender-dijkstra-7xrlxt`, commit `a545bc7`) est construite à chaque
déploiement et reste en ligne sous `/sauvegarde/` (https://mermernoa.github.io/projet-kebab/sauvegarde/).
