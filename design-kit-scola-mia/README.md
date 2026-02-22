# Scola-Mia.com Design Kit

Pacchetto grafico ufficiale per replicare lo stile di **scola-mia.com**.

## Contenuto

- `tokens/design-tokens.json`: token di design (colori, tipografia, spaziature, bordi, ombre, motion)
- `css/scola-mia-theme.css`: variabili CSS + classi base riutilizzabili
- `tailwind/scola-mia-tailwind-preset.js`: preset Tailwind coerente con il sito
- `docs/component-recipes.md`: linee guida pratiche per componenti principali
- `assets/favicon-scola-mia.svg`: favicon/logo usato nel sito

## Font da caricare

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
```

## Uso rapido

1. Includi `css/scola-mia-theme.css`.
2. Applica `class="sm-body"` sul `body`.
3. Usa `sm-headline` per titoli display e `sm-card` per box principali.
4. Se usi Tailwind, importa il preset `tailwind/scola-mia-tailwind-preset.js`.

## Principi visual

- Stile editoriale brutale: bordi neri netti + ombre squadrate.
- Contrasto alto: nero su carta chiara con accento blu.
- Titoli impattanti con `Bebas Neue`, contenuti con `IBM Plex Sans`.
- Spaziature generose e griglia pulita.
