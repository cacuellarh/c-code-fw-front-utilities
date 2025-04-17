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
npm install your-library-name
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

## Contributing

Feel free to contribute to this library by submitting issues or pull requests.

---

## License

This project is licensed under the MIT License.