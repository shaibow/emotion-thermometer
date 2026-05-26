# Emotion thermometer (English)

Full English translation of the Dutch emotion-thermometer materials in `examples/`, plus fillable documents and a small static site for [Vercel](https://vercel.com).

## What’s included

| Item | Description |
|------|-------------|
| [`docs/Your-Thermometer.md`](docs/Your-Thermometer.md) | **Blank template** to fill in (Markdown) |
| [`docs/Example-Angry-Thermometer.md`](docs/Example-Angry-Thermometer.md) | Completed example — anger |
| [`docs/Example-Scared-Thermometer.md`](docs/Example-Scared-Thermometer.md) | Completed example — fear |
| [`site/`](site/) | Fillable web pages (auto-save in browser, print to PDF) |
| [`examples/`](examples/) | Original Dutch PDF and Word files |

### Column labels (Dutch → English)

| Dutch | English |
|-------|---------|
| Gevoel | Feeling |
| Lichamelijke signalen | Physical signals |
| Gedachten | Thoughts |
| Gedrag | Behavior |
| Wat kan ik doen? | What can I do? |

## Use locally

Open `site/index.html` in a browser, or serve the folder:

```bash
npx serve site
```

Then open the URL shown (usually http://localhost:3000).

## Deploy to your GitHub + Vercel

### 1. New GitHub repository

```bash
cd path/to/thermometer
git init
git add docs site examples vercel.json README.md .gitignore
git commit -m "Add English emotion thermometer templates and site"
```

Create a new empty repo on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 2. Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository.
3. Leave **Framework Preset** as Other (static).
4. Confirm **Output Directory** is `site` (from `vercel.json`).
5. Deploy.

Your site will be live at a `*.vercel.app` URL. The fillable pages save progress in the browser’s local storage on that domain.

## Development helpers

Optional scripts to extract text from the original Word/PDF files (requires `npm install`):

```bash
node scripts/extract-text.cjs
```

## License

The original Dutch materials are in `examples/` for personal/educational use. Adapt the English versions as you need for your own project.
