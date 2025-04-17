import {
    Directive,
    ElementRef,
    HostListener,
    Input,
    Renderer2,
  } from '@angular/core';
import { ElementActiveService } from './element-active.service';
  
  @Directive({
    selector: '[appElementActive]',
    standalone: true,
  })
  export class ElementActiveDirective {
    @Input() activeClass:string = "active"
    constructor(
      private el: ElementRef,
      private render: Renderer2,
      private elementService: ElementActiveService
    ) {}
    @HostListener('click') onClick() {
      this.elementService.setActiveElement(this.el.nativeElement,this.activeClass);
      this.render.addClass(this.el.nativeElement, this.activeClass)
    }
  }
  