# C-Code CMS

Local editor for the content of client sites (plans, services, prices…). It runs in the browser, opens the site's folder on your computer and writes its JSON files directly. There is no server, database or login, and nothing leaves the computer: to publish, commit and push the site as usual.

## Use

```bash
npm run cms          # http://localhost:4300 (Chrome or Edge)
```

1. **Agregar sitio** → choose the site's folder, for example `C:\dev\xora-spa`.
   - The first time, the CMS creates `cms.json` in that folder.
   - The file records the kind of site (scope), its name and its public address.
   - Commit it with the site.
2. Edit. The list shows warnings: missing fields, duplicate addresses, services that don't exist…
3. **Guardar** writes the changed JSON files and rebuilds the generated files (in spa: `prerender-routes.txt` and `sitemap.xml`).
   - If a file changed outside the CMS after it was opened, it asks before overwriting.
4. Review the changes with `git diff` in the site, then commit and push. Vercel deploys.

Uploaded photos are resized to at most 1600 px and saved as WebP in the site's assets. Icons keep their format.

The first save of an existing file normalizes its indentation. After that, each save only changes the edited lines.

## `cms.json`

```json
{
  "scope": "spa",
  "name": "Ixora Spa Bucaramanga",
  "siteUrl": "https://ixoraspabucaramanga.com",
  "assets": { "url": "/assets/", "dir": "src/assets/" },
  "theme": "src/styles.css",
  "collections": { "priceRanges": false },
  "options": { "planRoute": "/planes/" }
}
```

- `theme`: stylesheet with the site's colors and fonts. The previews use them.
- `collections`: another path for a collection, or `false` to hide it.
- `options`: settings specific to the scope.

## Architecture

- `src/domain/`: framework-free rules and scopes, with ports for everything external.
- `src/shell/`: Angular UI and the adapters (File System Access, IndexedDB, canvas).

The rules are in `.claude/rules/cms-architecture.md`, and adding a kind of site is described in `src/domain/scopes/README.md`.

```bash
npm run lint:cms                                   # architecture rules
npx ng test cms --watch=false --browsers=ChromeHeadless
```
