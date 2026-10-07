# THC Calculator

A small web calculator that converts a THC amount in milligrams to grams of dried cannabis flower, and back, using the flower's THC potency.

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

## Features

- mg THC → grams of flower, and grams → mg THC
- Shows the working for each calculation
- Table of the same amount at common potencies (10–35%)
- Accepts input like `15,000`, `15000mg` or `25%`
- Light and dark mode (remembers your choice)
- Built for phones as well as desktop: adapts to any screen size, finger-sized buttons, number keypad on iPhone and Android, and can be added to the home screen like an app
- The address bar keeps the current inputs, so a calculation can be shared as a link, e.g. `?amount=15000&potency=25`
- Plain HTML, CSS and JavaScript. No build step, no tracking, works offline once loaded

## Running locally

Open `index.html` in a browser. That's it.

## Hosting

Served by GitHub Pages from the `main` branch root. Any push to `main` updates the live site.

## Disclaimer

A reference tool for converting between units. It does not replace clinical judgement, the prescription, or the product's certificate of analysis.
