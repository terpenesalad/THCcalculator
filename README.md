# THC Calculator

A small web calculator that converts a THC amount in milligrams to grams of flower or hash/concentrate, or a number of edible pieces, and back again.

**Live site:** https://terpenesalad.github.io/THCcalculator/

## The maths

```
THC per gram (mg)   = potency (%) × 10
Grams of flower     = total THC (mg) ÷ THC per gram (mg)
Total THC (mg)      = grams of flower × THC per gram (mg)
```

| Potency | THC per gram | 15,000 mg equals |
|---------|--------------|------------------|
| 20%     | 200 mg       | 75 g             |
| 25%     | 250 mg       | 60 g             |
| 30%     | 300 mg       | 50 g             |

The result covers the same period as the amount entered (15,000 mg per month at 25% is 60 g per month).

Hash and concentrates use the same formula, just with higher potencies (e.g. 15,000 mg at 70% = 21.4 g).

Edibles:

```
Pieces          = total THC (mg) ÷ mg THC per piece
mg THC per day  = total THC (mg) ÷ days in the period
```

The calculator flags edible amounts above **40 mg THC per day**. That limit is set in one place, `EDIBLE_DAILY_LIMIT_MG` at the top of `app.js`, if it ever needs changing.

## Features

- Flower, hash/concentrate and edibles
- mg THC → grams (or pieces), and back
- Hash/concentrate: shows how many packs that is (pack size defaults to 1 g)
- Edibles: works out mg per day over a period and warns above 40 mg/day
- Shows the working for each calculation
- Accepts input like `15,000`, `15000mg` or `25%`
- Light and dark mode (remembers your choice)
- Built for phones as well as desktop: adapts to any screen size, finger-sized buttons, number keypad on iPhone and Android, and can be added to the home screen like an app
- The address bar keeps the current inputs, so a calculation can be shared as a link, e.g. `?amount=15000&potency=25` or `?type=edible&amount=1200&potency=10`
- Plain HTML, CSS and JavaScript. No build step, no tracking

## Running locally

Open `index.html` in a browser. That's it.

## Hosting

Served by GitHub Pages from the `main` branch root. Any push to `main` updates the live site.

## Disclaimer

A reference tool for converting between units. It does not replace clinical judgement, the prescription, or the product's certificate of analysis.
