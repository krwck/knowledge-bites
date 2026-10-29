# Knowledge Cards

Little puzzles, big “aha!” — a page of cards for kids aged 8–15. Each card opens a tiny game that teaches one idea from school.

## Puzzles

| Puzzle | Idea | Status |
| --- | --- | --- |
| **Balance it!** | Moving a number across `=` flips its sign | Playable |
| Fraction pizza | Equivalent fractions | Planned |
| Island bridges | Logic / planning | Planned |
| What comes next? | Patterns | Planned |
| Code breaker | Deduction | Planned |
| **Number jumper** | Times tables / multiples | Playable |

## Polish version

`pl/index.html` and each `puzzles/*/pl.html` are Polish copies of the English pages (EN/PL link in the header). They share CSS, JS and levels; each puzzle's JS picks its UI strings from `<html lang>`. When you change an English page, mirror the change in its Polish copy.

## Run it

It's plain HTML, CSS and JavaScript — no build step, no dependencies.

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` straight from disk works too.

## Deploy on GitHub Pages

Repo **Settings → Pages → Build and deployment → Deploy from a branch**, pick `main` and `/ (root)`. All links are relative, so it works under `https://<you>.github.io/<repo>/`.

## Structure

```
index.html              hub page (cards + subject filter)
css/style.css           shared look: colours, type, cards, buttons
js/hub.js               filter chips + earned-stars badge on cards
img/logo.svg
puzzles/
  balance/
    index.html          the "Balance it!" puzzle
    balance.css
    levels.js           level data — edit this to add levels
    balance.js          game logic (pure functions) + UI
tests/
  balance.test.js       node --test
```

## Adding a level to Balance it!

Append to `puzzles/balance/levels.js`:

```js
{ l: [6, -1], r: [2, 3] }        // 6 − 1 = 2 + 3, goal: both sides 0
{ l: [6, -1], r: [2, 3], t: 1 }  // goal: both sides add up to 1
```

Both sides must add up to the same number, and the goal `t` (default 0) must be reachable but not already met; `node --test` checks this. The fewest-moves count (for stars) is worked out automatically.

## Adding a new puzzle

1. Create `puzzles/<name>/index.html` (copy the header and stylesheet links from `puzzles/balance/index.html`).
2. In `index.html`, turn its "Coming soon" card into a link: replace `<div class="card soon" aria-disabled="true">` with `<a href="puzzles/<name>/" class="card">`, remove the grey badge.
3. To show earned stars on the card, save `{ best: { "<level>": stars }, levels: N }` to `localStorage` under `kc:<name>` and add `<span class="stars-earned" data-progress="<name>"></span>` to the card.
