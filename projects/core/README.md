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

Presentational components for spa and catalog sites. They are standalone Angular 19 components (signal inputs, OnPush) and work with SSR and prerendering. Styling is plain CSS driven by CSS variables, so a site needs no Tailwind configuration to use them.

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

Set the site palette in `styles.css`. Every variable is optional:

```css
:root {
  --cc-primary: #4C6B4A;
  --cc-primary-light: #A0BA9E;
  --cc-primary-dark: #022B04;
  --cc-secondary: #CEAB5D;
  --cc-secondary-light: #f8f4ee;
  --cc-secondary-dark: #9A7521;
  --cc-bg: #F0FFEF;
}
```

A list of every token is in `node_modules/@c-code/c-code-fw/ui/theme/tokens.css`. You can add that file to `angular.json` → `styles`, or copy the variables you need.

Roles: by default each role follows a palette color. Set a role only when the site needs it to differ:

| Role | Used for | Default |
|---|---|---|
| `--cc-surface` | cards, sidebar, detail panel | `--cc-secondary-light` |
| `--cc-text` | text inside components | `--cc-primary` |
| `--cc-heading` | titles, price badge | `--cc-primary` |
| `--cc-accent` | buttons, highlighted titles | `--cc-secondary` |
| `--cc-accent-hover` | button hover | `--cc-secondary-dark` |
| `--cc-on-accent` | text on buttons and badges | `--cc-bg` |
| `--cc-font-heading` | title font | `inherit` |

### Components

All text has Spanish defaults, and every label can be changed through an input.

| Component | Main inputs | Outputs / notes |
|---|---|---|
| `<cc-plan-catalog>` | `plans`*, `services`, `priceRanges`, `categories`, `initialCategory`, `detailsLink`, `showCounts`, `showBanner`, `showSearch`, `titlePrefix`, `imageAltSuffix`, `emptyMessage`, `searchIconSrc`, `filterIconSrc` | `categoryChange`. The full plan list page. For a custom card: `<ng-template ccPlanCard let-plan let-link="link">` (import `PlanCardTemplateDirective`). |
| `<cc-plan-details>` | `plan`*, `bookingUrl`*, `bookingLabel`, `backLink`, `perks`, `perksTitle`, `perksImageSrc`, `titleIconSrc`, `durationIconSrc`, `personIconSrc`, `peopleIconSrc`, `currencyCode`, `currencyDisplay`, `imageAltSuffix` | Content in `<ng-content>` goes above the gift box; an element with the `ccDetailsMedia` attribute goes under the photo. |
| `<cc-plan-card>` | `name`*, `imageSrc`*, `link`, `ctaLabel`, `subtitle`, `imageAlt` | `ctaClick` |
| `<cc-category-menu>` | `options`*, `[(selected)]`, `title` | |
| `<cc-search-box>` | `[(value)]`, `placeholder`, `iconSrc` | `search` |
| `<cc-plan-filter-form>` | `services`, `priceRanges`, labels | `filterChange` |
| `<cc-page-banner>` | `title`*, `variant` (`band` \| `plain`), `iconSrc`, `backLink` | Renders the page `<h1>`. |
| `<cc-gallery>` | `images`*, `backgroundImage` | Opens `cc-lightbox`. `numberedImages(18, i => \`assets/galery/${i}.jpeg\`)` builds the list. |
| `<cc-lightbox>` | `images`*, `[(index)]` | Arrow keys and Escape. |
| `<cc-info-item>` | `title`*, `text` | Projects extra content (lists). |
| `<cc-faq>` | `items`*, `title` | Native `<details>`, prerendered. |
| `<cc-whatsapp-button>` | `href`*, `iconSrc`, `position`, `label` | Floating button. Without `iconSrc` it draws the WhatsApp logo. |
| `<cc-promo-modal>` | `[(open)]`, `imageSrc`, `imageAlt`, `link`, `closeOnBackdrop` | `closed`. Without `imageSrc` it shows the projected content. |
| `<cc-social-links>` | `links`*, `size`, `gap` | |

`*` required.

Component variables (they default to the roles above): `--cc-plan-card-width`, `--cc-plan-card-width-lg`, `--cc-plan-card-height`, `--cc-plan-card-bg`, `--cc-plan-card-cta-bg`, `--cc-catalog-column-min`, `--cc-catalog-panel-bg`, `--cc-category-active-bg`, `--cc-category-active-color`, `--cc-details-panel-bg`, `--cc-details-price-bg`, `--cc-details-gift-border`, `--cc-banner-bg`, `--cc-banner-color`, `--cc-banner-font-size`, `--cc-info-title-color`, `--cc-info-text-color`, `--cc-faq-bg`, `--cc-gallery-thumb-width`, `--cc-gallery-thumb-width-lg`, `--cc-gallery-columns-lg`, `--cc-whatsapp-size`, `--cc-whatsapp-size-lg`, `--cc-whatsapp-offset-x`, `--cc-whatsapp-offset-y`, `--cc-modal-backdrop`, `--cc-lightbox-backdrop`.

### Services and utilities

- `PlanCatalogService`: `getPlans()` (with `additionalServices` joined), `getAdditionalServices()`, `getPriceRanges()`, `getPlanBySlug()`, `getPlansByCategory()`, `getPlansByFilter()`, `getPlansByName()`. Each JSON file is requested once and cached. Configure the paths with `providePlanCatalog({ plansUrl, additionalsUrl, priceRangesUrl })`; pass `priceRangesUrl: null` if the site has no price ranges.
- `SeoService`: `update({ title, description, path, image })` sets the title, description, canonical URL and Open Graph/Twitter tags. `setJsonLd(id, data)` and `removeJsonLd(id)` manage JSON-LD blocks.
- Pure functions: `slugify`, `planSlug`, `findPlanBySlug`, `filterPlans`, `filterPlansByCategory`, `searchPlansByName`, `withCategoryCounts`, `joinAdditionalServices`, `whatsappUrl(phone, message)`, `titleCase`, `truncateText`.
- Models: `Plan`, `AdditionalService`, `PriceRange`, `PlanFilter`, `PlanCategory`, `CategoryOption`, `GalleryImage`, `SocialLink`, `FaqItem`.

### Example: plan list page

```ts
import { toSignal } from '@angular/core/rxjs-interop';
import { PlanCatalogComponent, PlanCatalogService } from '@c-code/c-code-fw/ui';

@Component({
  imports: [PlanCatalogComponent],
  template: `<cc-plan-catalog [plans]="plans()" [services]="services()" [priceRanges]="ranges()" />`,
})
export class PlanListComponent {
  private catalog = inject(PlanCatalogService);
  plans = toSignal(this.catalog.getPlans(), { initialValue: [] });
  services = toSignal(this.catalog.getAdditionalServices(), { initialValue: [] });
  ranges = toSignal(this.catalog.getPriceRanges(), { initialValue: [] });
}
```

### Development

`npx ng serve showcase` runs a playground with every component at http://localhost:4200. It loads the data and images from `../medellin-spa/src/assets`, and `?theme=xora` switches to a second palette.

---

## Contributing

Feel free to contribute to this library by submitting issues or pull requests.
https://github.com/cacuellarh/c-code-fw-front-utilities
---

## License

This project is licensed under the MIT License.