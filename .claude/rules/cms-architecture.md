---
paths:
  - projects/cms/**
---

# CMS architecture: pure domain, shell for everything external

The CMS (`projects/cms`) is split in two layers. `npm run lint:cms` enforces the rules below.

## `src/domain/`: framework-free TypeScript

- Content rules: collections, validation, add, delete, move, dirty state, saving, generated files, manifest.
- Scopes (`domain/scopes/<id>/`): the definition of each kind of site (spa, restaurant…) as data plus pure functions.
- **May import:** other files in `domain/`, and `@cc/ui-domain`, which holds the models and utilities of `@c-code/c-code-fw/ui` without Angular. It keeps slugs, prices and categories identical to the sites.
- **Must not import:** `@angular/*`, `shell/`, or any other package.
- **Must not use browser APIs:** `window`, `document`, `indexedDB`, `localStorage`, `navigator`, file handles, canvas, object URLs. When the domain needs something from outside, declare an interface in `domain/ports.ts` and let the shell implement it.
- **State is immutable:** functions receive a `SiteContent` and return a new one.
- **Tests:** specs live next to the code and use the fakes in `domain/testing/` (`MemoryContentRepository`, `MemorySiteFiles`), so they never touch the DOM or the network. Every rule gets a spec.

## `src/shell/`: communication with the outside

- **`adapters/`:** implementations of the ports. They are Firestore (`FirestoreContentRepository`, and `FirestoreMediaStore` for the image library), the Vercel Deploy Hook (`VercelDeployHookPublisher`), File System Access for importing sites (`FsSiteFiles`), canvas to WebP/JPEG (`CanvasImageEncoder`) and fonts. Firebase setup lives in `adapters/firebase.ts` and `firebase.config.ts`; nothing Firebase-specific goes into the domain. `app.config.ts` provides them through the tokens in `state/ports.tokens.ts`.
- **`state/`:** Angular services with signals. They hold the current snapshot and call the domain. No business rules here: if a service starts deciding something about the content, move that into the domain.
- **`ui/`:** pages, fields and previews.
  - Each component has its own `.ts`, `.html` and `.css` files, with no inline templates or styles.
  - Colors and sizes come from the `--cms-*` tokens in `src/styles.css`.
  - The site's `--cc-*` roles are only used inside `.site-theme`, for previews.
  - Previews are registered by key in `ui/previews/previews.ts`. A scope only names the key (`preview: 'spa.plan'`).

## `src/cli/`: the build command (second shell, for Node)

- `c-code-content pull --site <id> --project <firebase-project>` runs before each site's build.
  - It reads Firestore through its public REST API (`firestore-rest-reader.ts`).
  - It writes the site folder (`NodeSiteFiles`) with the domain's `writeSiteFolder`, so the JSON, routes and sitemap come out exactly as the domain defines them.
- **May import:** `domain/` and `node:` built-ins only. It must not import the browser shell, Angular or Firebase.
- **Build:** `npm run build:content` type-checks it and bundles it into `dist/content` (package `@c-code/content`). The version lives in `projects/cms/content.version.json`.

## Adding a kind of site

See `src/domain/scopes/README.md`. A scope must not require changes in the shell. The exception is a new field type or a preview.
