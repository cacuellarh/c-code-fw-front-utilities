# Core Library

This library provides utility services and directives for managing screen width events, toggling element states, and handling active element states. It is designed to simplify common tasks in web applications, such as handling responsive behavior, managing element visibility, and applying active states to elements.

---

## Classes and Directives

### 1. **`ScreenWidthEventService`**
This service is used to handle screen width-related events, such as detecting the current screen width or executing functions based on specific screen width breakpoints.

#### **Features:**
- Provides the current screen width and height.
- Executes functions when the screen width meets specific conditions.
- Subscribes to window resize events with a debounce mechanism.

#### **Example Usage in Angular:**

**Component:**
```typescript
import { Component, OnInit } from '@angular/core';
import { ScreenWidthEventService } from './lib/screen_width-event.service';
import { ScreenWidthType } from './lib/types/screen_width-type';

@Component({
  selector: 'app-screen-width-demo',
  template: `
    <p>Current Screen Width: {{ screenWidth }}</p>
    <p *ngIf="isMobile">This is a mobile view!</p>
  `,
})
export class ScreenWidthDemoComponent implements OnInit {
  screenWidth: number = 0;
  isMobile: boolean = false;

  constructor(private screenWidthService: ScreenWidthEventService) {}

  ngOnInit(): void {
    this.screenWidth = this.screenWidthService.getScreenWidth();
    this.isMobile = this.screenWidth <= ScreenWidthType.SM;

    this.screenWidthService.executeFuncByScreenWidth(() => {
      this.isMobile = this.screenWidthService.getScreenWidth() <= ScreenWidthType.SM;
    }, ScreenWidthType.SM);
  }
}
```

---

### 2. **`ElementToggleService`**
This service is used to toggle the state of elements, such as showing or hiding elements, or toggling CSS classes on elements.

#### **Features:**
- Toggles the state of an element based on a specific status type.
- Toggles a CSS class on an element.
- Removes the active class from all elements in the history.

#### **Example Usage in Angular:**

**Component:**
```typescript
import { Component } from '@angular/core';
import { ElementToggleService } from './lib/element_toggle.service';
import { ElementStatusType } from './lib/types/element_status-type';

@Component({
  selector: 'app-element-toggle-demo',
  template: `
    <button (click)="toggleElement()">Toggle Element</button>
    <div id="toggle-element" class="hidden">This is a toggled element!</div>
  `,
})
export class ElementToggleDemoComponent {
  constructor(private elementToggleService: ElementToggleService) {}

  toggleElement(): void {
    const element = document.getElementById('toggle-element');
    if (element) {
      this.elementToggleService.toggleByClassName(element, 'hidden');
    }
  }
}
```

---

### 3. **`ElementActiveService`**
This service is used to set an element as active by adding a specific CSS class to it. It ensures that only one element is active at a time.

#### **Features:**
- Sets an element as active and applies the specified active class.
- Deactivates all other elements except the one clicked.
- Maintains a register of clicked elements.

#### **Example Usage in Angular:**

**Component:**
```typescript
import { Component } from '@angular/core';
import { ElementActiveService } from './lib/element-active.service';

@Component({
  selector: 'app-element-active-demo',
  template: `
    <button (click)="setActive($event)" class="btn">Button 1</button>
    <button (click)="setActive($event)" class="btn">Button 2</button>
    <button (click)="setActive($event)" class="btn">Button 3</button>
  `,
  styles: [
    `
      .btn {
        margin: 5px;
        padding: 10px;
        border: 1px solid #ccc;
      }
      .active {
        background-color: #007bff;
        color: white;
      }
    `,
  ],
})
export class ElementActiveDemoComponent {
  constructor(private elementActiveService: ElementActiveService) {}

  setActive(event: Event): void {
    const element = event.target as HTMLElement;
    this.elementActiveService.setActiveElement(element, 'active');
  }
}
```

---

### 4. **`ElementActiveDirective`**
This directive simplifies the process of managing active states for elements. It listens for click events on the host element and applies the specified active class.

#### **Features:**
- Automatically applies the active class to the clicked element.
- Deactivates all other elements when a new element is clicked.
- Works seamlessly with `ElementActiveService`.

#### **Example Usage in Angular:**

**Template:**
```html
<button appElementActive [activeClass]="'active'" class="btn">Button 1</button>
<button appElementActive [activeClass]="'active'" class="btn">Button 2</button>
<button appElementActive [activeClass]="'active'" class="btn">Button 3</button>
```

**Styles:**
```css
.btn {
  margin: 5px;
  padding: 10px;
  border: 1px solid #ccc;
}
.active {
  background-color: #007bff;
  color: white;
}
```

---

## Installation

To use this library in your project, install it via npm:

```bash
npm install @c-code/c-code-fw@[version]
```

---

## Tailwind CSS Breakpoints

The `ScreenWidthEventService` uses Tailwind CSS breakpoints for responsive behavior:

| Breakpoint | Pixels (min-width) | Description          |
|------------|---------------------|----------------------|
| `XS`       | `< 640px`          | Extra small screens  |
| `SM`       | `640px`            | Small screens        |
| `MD`       | `768px`            | Medium screens       |
| `LG`       | `1024px`           | Large screens        |
| `XL`       | `1280px`           | Extra large screens  |
| `2XL`      | `1536px`           | 2x Extra large screens |

---

## UI components: `@c-code/c-code-fw/ui`

Presentational components for spa and catalog sites: standalone Angular 19 components with signal inputs and OnPush, safe for SSR and prerendering. Styling is plain CSS driven by CSS variables, so a site needs no Tailwind configuration to use them.

### Who owns what

- **The library owns structure:** type scale, spacing, radii, shadows, control heights, motion and layers. Each component also exposes props to choose how it looks (`variant`, `tone`, `size`, `layout`, `appearance`, `italic`…).
- **The site owns identity:** colors and fonts. The library ships **no palette**. Components read a contract of semantic roles that each site maps from its own variables. Without a site theme, components render in neutral grays.

### Setup

```ts
// app.config.ts
import { provideHttpClient, withFetch } from '@angular/common/http';
import { providePlanCatalog, provideSeo } from '@c-code/c-code-fw/ui';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
    providePlanCatalog(), // reads assets/data/{plans,additionals,priceRanges}.json
    provideSeo({ siteUrl: 'https://www.example.com', defaultImage: '/assets/images/og.jpeg' }),
  ],
};
```

Theme the site in `styles.css`, using any names for your brand variables:

```css
:root {
  /* Brand, owned by the site */
  --laurel-green: #4c6b4a;
  --laurel-gold: #ceab5d;

  /* Roles read by the components */
  --cc-heading: var(--laurel-green);
  --cc-text: var(--laurel-green);
  --cc-accent: var(--laurel-gold);
  --cc-on-accent: #022b04;
  --cc-font-heading: 'El Messiri', serif;
}
```

Optionally add `node_modules/@c-code/c-code-fw/ui/theme/tokens.css` to `angular.json` → `styles` to use the same scales in the site's own markup, for example by mapping Tailwind's `fontSize` to `var(--cc-text-*)`.

### Color and font roles (set by the site)

| Role | Used for | Neutral default |
|---|---|---|
| `--cc-canvas` | page background behind components, input fields | `#ffffff` |
| `--cc-surface` | cards, panels, sidebar | `#f5f5f4` |
| `--cc-surface-alt` | alternative bands, image placeholders | `#fafaf9` |
| `--cc-text` | body text | `#292524` |
| `--cc-text-muted` | counters, metadata | `--cc-text` at 72% |
| `--cc-heading` | titles | `#1c1917` |
| `--cc-accent` / `--cc-accent-hover` | primary buttons, active items | `#1c1917` / `#44403c` |
| `--cc-accent-text` | accent used as text (needs 4.5:1) | `--cc-heading` |
| `--cc-on-accent` | text on the accent (needs 4.5:1) | `#ffffff` |
| `--cc-inverse` / `--cc-inverse-hover` / `--cc-on-inverse` | dark blocks: price badge, dark buttons | `#1c1917` / `#000` / `#fff` |
| `--cc-border` / `--cc-border-strong` | dividers / input borders (3:1) | `#d6d3d1` / `#78716c` |
| `--cc-focus-ring` | keyboard focus | `--cc-heading` |
| `--cc-overlay` | modal and lightbox backdrop | `rgb(0 0 0 / 0.7)` |
| `--cc-danger`, `--cc-danger-surface`, `--cc-on-danger-surface` | warnings (`cc-notice tone="warning"`) | reds |
| `--cc-whatsapp`, `--cc-whatsapp-hover`, `--cc-on-whatsapp` | WhatsApp buttons | WhatsApp green |
| `--cc-font-body`, `--cc-font-heading` | font families | `inherit` |
| `--cc-heading-style`, `--cc-heading-transform`, `--cc-heading-tracking` | italic, uppercase, letter spacing of titles | `normal`, `none`, `normal` |

### Structure tokens (owned by the library)

All of them can be overridden, but they already have values: `--cc-text-xs…4xl`, `--cc-leading-*`, `--cc-weight-*`, `--cc-space-1…24` (4px base, same steps as Tailwind), `--cc-radius`, `--cc-radius-sm|md|lg|pill`, `--cc-shadow-sm|…|xl`, `--cc-focus-width|offset`, `--cc-control-height` (44px) and its `-sm`/`-lg` versions, `--cc-duration(-fast)`, `--cc-ease`, `--cc-z-float|sticky|overlay`. Breakpoints: 640, 768 and 1024px.

### Components

All text has Spanish defaults, and every label is an input.

| Component | Main inputs | Notes |
|---|---|---|
| `a[ccButton]`, `button[ccButton]` | `variant` (`primary`, `secondary`, `ghost`, `whatsapp`, `inverse`), `size` (`sm`, `md`, `lg`), `block` | The shared call-to-action style used by every component. |
| `<cc-plan-catalog>` | `plans`* (`null` = loading), `[(category)]`, `initialCategory`, `services`, `priceRanges`, `categories`, `categoriesLayout` (`auto`, `list`, `chips`), `showPrice`, `priceFormat`, `planMeta`, `cardAppearance`, `ctaLabel`, `ctaVariant`, `detailsLink`, `contactHref`, `emptyMessage`, `emptyActionLabel` | Full plan list page. It shows skeletons while loading, an empty state with actions, and a custom card through `<ng-template ccPlanCard let-plan let-link="link">`. |
| `<cc-plan-details>` | `plan`*, `bookingUrl`* (string or `(plan) => string`), `bookingLabel`, `barBookingLabel`, `bookingVariant`, `stickyBar`, `priceFormat`, `priceNote`, `perks`, `perksTitle`, `perksImageSrc`, icon inputs | It puts a booking button near the price and another at the end, and shows a fixed price and booking bar below 1024px. |
| `<cc-plan-card>` | `name`, `imageSrc`, `price`, `priceLabel`, `priceFormat`, `meta`, `link`, `queryParams`, `ctaLabel`, `ctaVariant`, `appearance` (`filled`, `outlined`, `plain`), `headingLevel`, `skeleton` | The whole card is clickable when it has a `link`. |
| `<cc-category-menu>` | `options`*, `[(selected)]`, `title`, `layout` | Toggle buttons with `aria-pressed`. |
| `<cc-search-box>` | `[(value)]`, `placeholder`, `label`, `iconSrc` | `search` output. |
| `<cc-plan-filter-form>` | `services`, `priceRanges`, `mode` (`instant`, `submit`), labels | `filterChange` output. |
| `<cc-page-banner>` | `title`*, `subtitle`, `variant` (`band`, `plain`), `size`, `italic`, `align`, `iconSrc`, `backLink` | Renders the page `<h1>`. |
| `<cc-section-heading>` | `title`*, `subtitle`, `eyebrow`, `iconSrc`, `level`, `size`, `italic`, `tone` (`default`, `inverse`, `accent`), `align`, `rule`, `headingId` | One heading pattern for every page section. |
| `<cc-gallery>` | `images`*, `columns`, `backgroundImage` | Opens `cc-lightbox`. `numberedImages(18, i => …)` builds the list. |
| `<cc-lightbox>` | `images`*, `[(index)]` | Arrows, swipe and Escape. Focus is trapped while open and restored on close. |
| `<cc-info-item>` | `title`*, `text`, `tone`, `size`, `headingLevel`, `headingId` | Projects extra content. |
| `<cc-notice>` | `tone` (`info`, `warning`, `success`), `title` | Highlighted note; content is projected. |
| `<cc-faq>` + `<cc-faq-item>` | `items` or projected `<cc-faq-item question="…">` | Native `<details>`, so answers are prerendered. Items can contain links. |
| `<cc-whatsapp-button>` | `href`*, `variant` (`icon`, `extended`), `label`, `size`, `position`, `iconSrc` | Floating button. |
| `<cc-promo-modal>` | `[(open)]`, `autoOpen`, `delayMs`, `rememberKey`, `rememberDays`, `imageSrc`, `imageAlt`, `link`, `ctaLabel`, `ctaHref` | It opens by itself in the browser and remembers the dismissal. |
| `<cc-social-links>` | `links`*, `size` (`sm`, `md`, `lg`), `tone` (`default`, `inverse`) | 44px tap area per link. |

`*` required. Each component also exposes its own `--cc-<component>-*` variables, which are listed in its JSDoc (`Tokens: …`).

### Services and utilities

- `PlanCatalogService`: `getPlans()` (with `additionalServices` joined), `getAdditionalServices()`, `getPriceRanges()`, `getPlanBySlug()`, `getPlansByCategory()`, `getPlansByFilter()`, `getPlansByName()`. Each JSON file is requested once and cached. Configure the paths with `providePlanCatalog({ plansUrl, additionalsUrl, priceRangesUrl })`.
- `SeoService`: `update({ title, description, path, image })`, `setJsonLd(id, data)`, `removeJsonLd(id)`, `absoluteUrl(path)`.
- Pure functions (no Angular): `formatPrice(value, { locale, currency, digits })` (default `es-CO`/`COP`: `$ 259.900`), `slugify`, `planSlug`, `findPlanBySlug`, `filterPlans`, `filterPlansByCategory`, `searchPlansByName`, `withCategoryCounts`, `joinAdditionalServices`, `defaultPlanMeta`, `whatsappUrl(phone, message)`, `titleCase`, `truncateText`.

### Migrating from 1.3

- The library no longer defines `--cc-primary`, `--cc-secondary`, `--cc-bg` or the other palette variables. Set the roles listed above from your own brand variables instead.
- Default colors are now neutral grays, and `--cc-on-accent` must be set when the accent is light.
- `cc-social-links`: `size` is now `sm`, `md` or `lg`, and `gap` became the `--cc-social-gap` token.
- `cc-plan-catalog`: `plans` accepts `null` (loading), and the category is the `[(category)]` model. The old `categoryChange` output still works, because it is the model's change event.
- `cc-promo-modal`: `open` now defaults to `false`; use `autoOpen` to open it by itself.
- `cc-plan-details`: prices use `formatPrice` (`priceFormat` input) instead of the currency pipe inputs.

### Development

- `npx ng serve showcase` runs a playground with every component. It loads the data and images from `../medellin-spa/src/assets`. Add `?theme=laurel` or `?theme=xora` to the URL to try a site theme; without it, the neutral defaults show.
- `npm run lint:ui` checks the architecture rules in `.claude/rules/ui-components.md`.

---

## Contributing

Feel free to contribute to this library by submitting issues or pull requests.
https://github.com/cacuellarh/c-code-fw-front-utilities
---

## License

This project is licensed under the MIT License.