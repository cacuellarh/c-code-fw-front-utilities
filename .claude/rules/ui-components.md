---
paths:
  - "projects/core/ui/**"
---

# Arquitectura de `@c-code/c-code-fw/ui`

Los componentes de esta entrada son puros: sin dependencias externas y sin acoplarse a ningún sitio. Cualquier cambio en `projects/core/ui/` sigue estas reglas. Antes de terminar, corre `npm run lint:ui`, que valida las reglas marcadas con ✔.

## Dependencias

- ✔ Solo se permiten imports de `@angular/core`, `@angular/common` (incluye `@angular/common/http`), `@angular/router`, `@angular/platform-browser`, `rxjs` y rutas relativas.
- No se agregan librerías de terceros: nada de Tailwind, Angular Material, `ngx-*`, `swiper`, librerías de íconos ni utilidades como lodash. Si algo parece necesitar una, se implementa en la librería o no se hace.
- ✔ `lib/models/` y `lib/utils/` son dominio puro en TypeScript. No importan `@angular/*` ni `rxjs`, para poder llevarlos a cualquier framework.

## Estructura del componente

- ✔ Cada componente tiene tres archivos en `lib/components/<nombre>/`: `<nombre>.component.ts` (lógica), `.html` (template) y `.css` (estilos). Nada de `template:` ni `styles:` inline.
- Standalone, `ChangeDetectionStrategy.OnPush`, selector con prefijo `cc-`.
- API con signals: `input()` / `input.required()`, `model()` para two-way binding y `output()`. Nada de `@Input`, `@Output` ni `EventEmitter`.
- Templates con `@if` / `@for` (con `track`), no `*ngIf` / `*ngFor`.
- Se exporta desde `src/public-api.ts`.

## Componentes presentacionales

- Los datos entran por inputs y los eventos salen por outputs. Un componente no hace peticiones HTTP ni lee JSON; eso lo hace `PlanCatalogService` y la página del sitio.
- Nada específico de un sitio dentro del componente: ni nombres de marca, ni teléfonos, ni URLs, ni rutas a imágenes del sitio.
- Todos los textos visibles son inputs con un valor por defecto en español.
- Los íconos son inputs (`...IconSrc`). Si están vacíos, se dibuja un SVG inline. La librería no incluye imágenes.
- Los componentes de página (`cc-plan-catalog`, `cc-plan-details`) se construyen combinando los componentes pequeños, no duplicándolos.

## Estilos

- CSS plano con clases BEM con prefijo del componente (`.cc-card`, `.cc-card__name`, `.cc-card--active`). No uses clases utilitarias.
- Los colores siempre salen de variables, con la cadena de fallback completa: `var(--cc-<rol>, var(--cc-<paleta>, #hex))`, por ejemplo `var(--cc-accent, var(--cc-secondary, #ceab5d))`. Nunca definas los roles en `:root`: se resolverían ahí y los overrides por sección dejarían de funcionar.
- Lo que un sitio quiera ajustar se expone como variable del componente, `--cc-<componente>-<propiedad>` (por ejemplo `--cc-plan-card-bg`), con el rol como fallback. Las variables nuevas se documentan en el README.
- `:host { display: block; }` salvo que el componente necesite otro display.
- Responsive con los breakpoints de Tailwind escritos a mano: 640, 768 y 1024px, mobile first.

## SSR y accesibilidad

- El código corre en el servidor durante el prerender. No uses `window`, `document` ni `localStorage` directamente: inyecta `DOCUMENT`, y lo que solo existe en el navegador va en eventos del usuario o en `effect`.
- El contenido importante para SEO (precios, textos, FAQ) debe quedar en el HTML prerenderizado: nada de Shadow DOM ni de renderizar solo en el cliente.
- Imágenes con `alt`, botones solo con ícono con `aria-label`, y los elementos clicables deben poder usarse con teclado.

## Al agregar o cambiar un componente

1. Tests en un `.spec.ts` dentro de `projects/core/ui/` (`npx ng test core --watch=false --browsers=ChromeHeadless`).
2. Una sección en el README (`projects/core/README.md`, "UI components").
3. Un ejemplo en el showcase (`projects/showcase`) y una revisión visual en escritorio y móvil con las dos paletas (`?theme=xora`).
4. `npm run lint:ui` y `npx ng build core` sin errores.
