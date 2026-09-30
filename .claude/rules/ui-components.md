---
paths:
  - "projects/core/ui/**"
---

# Arquitectura de `@c-code/c-code-fw/ui`

Los componentes de esta entrada son puros: sin dependencias externas, sin marca propia y sin acoplarse a ningún sitio. Cualquier cambio en `projects/core/ui/` sigue estas reglas. Antes de terminar, corre `npm run lint:ui`, que valida las reglas marcadas con ✔.

## Quién es dueño de qué

- **La librería es dueña de la estructura:** escalas de tipografía, espaciado, radios, sombras, alturas de controles, animación y capas (`--cc-text-*`, `--cc-space-*`, `--cc-radius-*`…), con valores por defecto en `lib/theme/tokens.css` y `lib/theme/component-base.css`.
- **El sitio es dueño de la identidad:** colores y tipografía. La librería **no define paleta ni colores de ningún cliente**. Solo lee un contrato de roles semánticos que el sitio asigna desde sus propias variables: `--cc-canvas`, `--cc-surface`, `--cc-surface-alt`, `--cc-text`, `--cc-text-muted`, `--cc-heading`, `--cc-accent`, `--cc-accent-hover`, `--cc-accent-text`, `--cc-on-accent`, `--cc-inverse`, `--cc-inverse-hover`, `--cc-on-inverse`, `--cc-border`, `--cc-border-strong`, `--cc-focus-ring`, `--cc-overlay`, `--cc-danger*`, `--cc-whatsapp*`, `--cc-font-body`, `--cc-font-heading`, `--cc-heading-style`, `--cc-heading-transform`, `--cc-heading-tracking`.
- Sin tema del sitio, los componentes se ven en grises neutros. Nunca pongas como valor por defecto el color de un cliente (verde Laurel, rosa Xora…).
- Para agregar un rol nuevo: defínelo en `component-base.css` con un fallback neutro, y documéntalo en el comentario de `tokens.css` y en el README.

## Tokens dentro del componente

- ✔ Cada componente lista `'../../theme/component-base.css'` **primero** en `styleUrls`. Esa base resuelve los tokens públicos en variables privadas `--_*` sobre el `:host`.
- El CSS del componente solo lee variables privadas (`var(--_space-4)`, `var(--_accent)`) o sus propias variables públicas `--cc-<componente>-<propiedad>`, con una privada como fallback: `var(--cc-plan-card-bg, var(--_surface))`.
- ✔ Nada de colores hex en el CSS de un componente: todo color sale de un rol. `rgb()` solo para sombras y transparencias neutras.
- Nunca definas roles en `:root`: se resolverían ahí y los overrides por sección dejarían de funcionar. Se resuelven en el `:host` de cada componente.
- Las variables públicas nuevas se documentan en el JSDoc del componente (`Tokens: …`) y en el README.

## Representación por props

- Cada componente maneja su propio estado y su apariencia. El sitio elige entre opciones con inputs (`variant`, `tone`, `size`, `layout`, `appearance`, `italic`…) y no sobrescribe el CSS interno del componente.
- Cada opción es una clase de modificador en el host (`host: { '[class.cc-card--outlined]': "appearance() === 'outlined'" }`) que cambia variables privadas del componente.
- Los botones y enlaces de acción usan `ccButton` (`a[ccButton]`, `button[ccButton]`) con `variant` y `size`. No crees botones con estilos propios dentro de otros componentes.
- Los inputs booleanos que se usan como atributo (`<cc-x italic>`) llevan `transform: booleanAttribute`.

## Dependencias

- ✔ Solo se permiten imports de `@angular/core`, `@angular/common` (incluye `@angular/common/http`), `@angular/router`, `@angular/platform-browser`, `rxjs` y rutas relativas.
- No se agregan librerías de terceros: nada de Tailwind, Angular Material, `ngx-*`, `swiper`, librerías de íconos ni utilidades como lodash.
- ✔ `lib/models/` y `lib/utils/` son dominio puro en TypeScript. No importan `@angular/*` ni `rxjs`, para poder llevarlos a cualquier framework.

## Estructura del componente

- ✔ Cada componente tiene tres archivos en `lib/components/<nombre>/`: `<nombre>.component.ts` (lógica), `.html` (template) y `.css` (estilos). Nada de `template:` ni `styles:` inline.
- Standalone, `ChangeDetectionStrategy.OnPush`, selector con prefijo `cc-` (excepción: los selectores de atributo como `a[ccButton]`).
- API con signals: `input()` / `input.required()`, `model()` para two-way binding y `output()`. Nada de `@Input`, `@Output` ni `EventEmitter`.
- Templates con `@if` / `@for` (con `track`), no `*ngIf` / `*ngFor`.
- Se exporta desde `src/public-api.ts`.

## Componentes presentacionales

- Los datos entran por inputs y los eventos salen por outputs. Un componente no hace peticiones HTTP ni lee JSON; eso lo hace `PlanCatalogService` y la página del sitio.
- Nada específico de un sitio dentro del componente: ni nombres de marca, ni teléfonos, ni URLs, ni rutas a imágenes del sitio.
- Todos los textos visibles son inputs con un valor por defecto en español.
- Los íconos son inputs (`...IconSrc`). Si están vacíos, se dibuja un SVG inline. La librería no incluye imágenes.
- Los estados propios (cargando, vacío, abierto, seleccionado) viven en el componente: `plans = null` muestra esqueletos en `cc-plan-catalog`, y `cc-promo-modal` decide cuándo abrirse con `autoOpen` y `rememberKey`.
- Los componentes de página (`cc-plan-catalog`, `cc-plan-details`) se construyen combinando los componentes pequeños, no duplicándolos.

## Estilos

- CSS plano con clases BEM con prefijo del componente (`.cc-card`, `.cc-card__name`, `.cc-card--active`). No uses clases utilitarias.
- `:host { display: block; }` salvo que el componente necesite otro display.
- Responsive con los breakpoints de Tailwind escritos a mano: 640, 768 y 1024px, mobile first.
- Áreas táctiles de al menos `var(--_control-height)` (44px) y `:focus-visible` visible (la base ya lo define).

## SSR y accesibilidad

- El código corre en el servidor durante el prerender. No uses `window`, `document` ni `localStorage` directamente: inyecta `DOCUMENT`; lo que solo existe en el navegador va en eventos del usuario, `effect` o `afterNextRender`, con `try/catch` alrededor del storage.
- El contenido importante para SEO (precios, textos, FAQ) debe quedar en el HTML prerenderizado: nada de Shadow DOM ni de renderizar solo en el cliente.
- Imágenes con `alt`, botones solo con ícono con `aria-label`, y los elementos clicables deben poder usarse con teclado. Los diálogos mueven el foco al abrirse, lo atrapan y lo devuelven al cerrarse.
- Contraste AA: los valores neutros por defecto lo cumplen; documenta el contraste mínimo que necesita cada rol.

## Al agregar o cambiar un componente

1. Tests en un `.spec.ts` dentro de `projects/core/ui/` (`npx ng test core --watch=false --browsers=ChromeHeadless`).
2. Una sección en el README (`projects/core/README.md`, "UI components"), con inputs y tokens.
3. Un ejemplo en el showcase (`projects/showcase`) y una revisión visual en escritorio y móvil, sin tema y con los temas de ejemplo (`?theme=xora`).
4. `npm run lint:ui` y `npx ng build core` sin errores.
