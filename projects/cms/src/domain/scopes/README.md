# Scopes

A scope describes one kind of client site: which JSON files it has, what each entry looks like, and which files are rebuilt from the content. The CMS draws every list and form from this description. It is pure data and functions, with no Angular (see `.claude/rules/cms-architecture.md`).

| Scope | Sites | Collections | Generated files |
|---|---|---|---|
| `spa` | Laurel Spa, Ixora Spa | plans, additionals (services), priceRanges\*, services\* (home highlights) | `prerender-routes.txt`, `public/sitemap.xml` |

\* Optional: a collection is hidden when the site doesn't have its file.

## Adding a scope (example: restaurant)

1. Create `restaurant/restaurant.scope.ts` exporting a `ScopeDef`:

   ```ts
   export const RESTAURANT_SCOPE: ScopeDef = {
     id: 'restaurant',
     label: 'Restaurante',
     description: 'Menú por categorías con precio y foto.',
     collections: [
       {
         id: 'dishes',
         label: 'Platos',
         singular: 'plato',
         file: 'src/assets/data/menu.json',
         idKey: 'id',
         titleKey: 'name',
         imageKey: 'photo',
         fields: [
           { key: 'name', label: 'Nombre', type: 'text', required: true },
           { key: 'price', label: 'Precio', type: 'number', format: 'price', width: 'half' },
           { key: 'category', label: 'Categoría', type: 'relation', collection: 'categories' },
           { key: 'photo', label: 'Foto', type: 'image', kind: 'photo' },
         ],
         create: () => ({ id: 0, name: '', price: 0, category: [], photo: '' }),
       },
       // categories…
     ],
   };
   ```

2. Add it to `SCOPES` in `index.ts`.
3. Add specs for its `validate` functions and generators.

A site joins the scope through its `cms.json`, which the CMS creates the first time the folder is added: `{ "scope": "restaurant", "name": "…" }`.

## What a scope can declare

- **Field types:**
  - `text`, `textarea`, `number` (with `format: 'price'`), `select`.
  - `relation`: ids of another collection.
  - `image`: chosen from the site's image library (`kind`: `photo` or `icon`; `thumbKey` also stores the thumbnail, for galleries). Everything is converted to WebP when uploaded.
- **`validate(item, all, ctx)`:** warnings shown in the list and the form. They don't block saving.
- **`generators`:** files rebuilt from the content every time the site is saved, for example routes or a sitemap. Each one receives the file's current text, so it can keep what it doesn't own.
- **`preview`:** the key of a preview component in the shell (`shell/ui/previews/previews.ts`).
- **`cms.json` → `options`:** per-site settings that only the scope reads, such as `planRoute`.
