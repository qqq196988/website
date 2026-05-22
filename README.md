# Global River POC Atlas

Static website for exploring 2,409 global river mouths and their annual POC flux records (1984-2018).

## Local preview

From this `site/` folder:

```bash
python3 -m http.server 8123
```

Then open:

```text
http://127.0.0.1:8123
```

## Rebuild web data assets

If you update the shapefile or Excel table, rerun:

```bash
python3 ../scripts/build_web_data.py
```

This regenerates:

- `data/river_points.geojson`
- `data/poc_timeseries.json`
- `data/summary.json`

## Free hosting options

This site is fully static, so you can publish it for free with:

- GitHub Pages
- Cloudflare Pages
- Netlify

For GitHub Pages, upload the contents of `site/` to a repository and publish from the repo root (or from `/docs` if you prefer to move it there).
