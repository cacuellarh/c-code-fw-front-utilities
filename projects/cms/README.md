# C-Code CMS

Editor for the content of client sites (plans, services, gallery, popup…). The content lives in
Firestore (project `c-code-bf1fd`). Each site's build reads it with `c-code-content pull` (see
`src/cli/`), so the CMS and the sites share one source of truth.

## Use

```bash
npm run cms          # http://localhost:4300 (Chrome or Edge)
```

Online it is deployed on Vercel from this repo (root `vercel.json`: builds only the CMS into
`dist/cms/browser`). Its address must be listed in Firebase → Authentication → Dominios autorizados.

Sign in with Google. What each person sees depends on their role:

| | Client (editor) | C-Code (admin) |
|---|---|---|
| Sites | Only theirs; with one site it opens directly | All, grouped by kind, and **Nuevo sitio** |
| Content and images | Edit, **Guardar**, **Publicar** | Same |
| **Configuración** of a site | — | Name, Deploy Hook, sections, importing from the project folder |
| Technical detail (ids, old images, error detail) | Hidden | Shown |

1. Edit a section. Problems show next to their field ("por revisar").
2. **Guardar** stores the changes in Firestore. If someone else saved first, the CMS says so.
3. **Publicar** (top bar) starts the site's build through its Vercel Deploy Hook. With unsaved
   changes it reads **Guardar y publicar**.

Images are uploaded to the site's library and converted in the browser: photos to WebP (1600 px,
plus a thumbnail and a JPEG for link previews), icons to WebP (256 px).

## Roles

- **Admins** are the documents `admins/{email}` in Firestore (created in the Firebase console;
  the document can be empty).
- **Editors** of a site are listed in `sites/{id}/private/access` → `editors: [emails]`.
- Every publication is logged in `sites/{id}/publications` (date and email), shown in
  Configuración › Publicaciones.
- `firestore.rules` enforces it: editors can only save existing sections, upload images and
  publish. Renaming, sections, Deploy Hook and access are for admins. Publish the rules in Firebase
  console → Firestore Database → Rules.

## Architecture

- `src/domain/`: framework-free rules and scopes, with ports for everything external.
- `src/shell/`: Angular UI and the adapters (Firestore, Vercel Deploy Hook, File System Access, canvas).
- `src/cli/`: `c-code-content`, the Node command the sites' builds run.

The rules are in `.claude/rules/cms-architecture.md`, and adding a kind of site is described in
`src/domain/scopes/README.md`.

```bash
npm run lint                                       # architecture rules (domain types, ESLint, dependency graph, layout)
npx ng test cms --watch=false --browsers=ChromeHeadless
```
