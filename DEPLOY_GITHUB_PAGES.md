# Publish This Site for Free with GitHub Pages

## Option A: Publish the `site/` folder directly from a repo root

1. Create a new GitHub repository, for example `global-river-poc-atlas`
2. Upload everything inside this `site/` folder to the repository root
3. On GitHub, open:
   `Settings -> Pages`
4. Under `Build and deployment`:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. Save and wait 1-3 minutes

Your site will appear at:

```text
https://YOUR_USERNAME.github.io/global-river-poc-atlas/
```

## Option B: Keep this project structure and publish from `/docs`

If you want to keep the larger project repo untouched:

1. Create a `docs/` folder in the GitHub repo
2. Copy all files from this `site/` folder into `docs/`
3. In GitHub Pages settings, choose:
   - Branch: `main`
   - Folder: `/docs`

## Notes

- This site is static, so GitHub Pages is enough. No server, database, or backend is required.
- Because `data_bundle.js` is included, the page can also work when opened directly as a local file.
