# Component Recipes (stile scolamia)

## 1) Header principale

Pattern usato nel sito:

- sfondo: `paper`
- bordo inferiore: `4px` nero
- blocco logo con icona su sfondo `accent`
- titolo brand con font display (`Bebas Neue`)
- navigazione uppercase semibold

Struttura consigliata:

```html
<header class="sm-card--thick" style="border-left:0;border-right:0;border-top:0;background:var(--sm-paper)">
  <div class="sm-container" style="display:flex;align-items:center;justify-content:space-between;padding:1rem 0;">
    <a href="#" class="sm-link" style="display:flex;align-items:center;gap:.75rem;">
      <div style="border:var(--sm-border-2);background:var(--sm-accent);padding:.375rem;">S</div>
      <div>
        <p class="sm-headline" style="font-size:1.8rem;line-height:1;">scola-mia.com</p>
        <p style="font-size:.72rem;font-weight:700;text-transform:uppercase;">Home</p>
      </div>
    </a>
    <nav class="sm-nav">
      <a href="#">Home</a>
      <a href="#">Articoli</a>
      <a href="#">Countdown</a>
      <a href="#">Agenda</a>
      <a href="#">Contatti</a>
    </nav>
  </div>
</header>
```

## 2) Card contenuto

- bordo nero `2px`
- shadow `brutal`
- titolo categoria piccolo uppercase accent
- titolo principale più pesante

```html
<article class="sm-card" style="padding:1rem;">
  <p class="sm-kicker">Categoria</p>
  <h3 style="font-size:1.25rem;font-weight:700;margin-top:.5rem;">Titolo contenuto</h3>
  <p style="margin-top:.5rem;color:var(--sm-muted);">Estratto o descrizione.</p>
</article>
```

## 3) Pulsanti

- sempre uppercase bold
- bordo 2px nero
- ombra brutal
- hover con mini lift

```html
<button class="sm-btn sm-btn--accent" style="padding:.625rem 1rem;">Azione principale</button>
<button class="sm-btn sm-btn--neutral" style="padding:.625rem 1rem;">Azione secondaria</button>
```

## 4) Hero principale

- card con bordo 4px e shadow brutal
- titolo display grande multilinea
- sottotitolo body semibold
- CTA accent

Suggerimento misure:

- `h1`: `clamp(3.6rem, 10vw, 7.5rem)`
- sottotitolo: `clamp(1.05rem, 2.2vw, 1.4rem)`

## 5) Griglia responsive

- mobile: 1 colonna
- tablet: 2 colonne
- desktop: 3 colonne
- gap consigliato: `1rem` / `1.25rem`

## 6) Motion minimale

- hover card: translate `-2px, -2px`
- durata: `200ms`
- easing: `ease`
- no effetti complessi; mantenere stile pulito/editoriale
