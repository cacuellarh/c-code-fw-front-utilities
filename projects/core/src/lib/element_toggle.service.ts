import {Injectable, signal } from '@angular/core';
import { ElementStatusType } from './types/element_status-type';

/**
 * Service to manage the state and classes of HTML elements,
 * used in menus and buttons to show or hide content.
 *
 */
@Injectable()
export class ElementToggleService {
  private elementStatus = signal<ElementStatusType>(ElementStatusType.DEFAULT);
  private elementsHistory: HTMLElement[] = [];
  private currentToggleClass: string = '';
  /**
   * Gets the current state of the element.
   * @returns Signal with the current state.
   */
  get elementStatusToggle() {
    if (this.elementStatus() === ElementStatusType.DEFAULT) {
      console.warn(
        'The element state is default. A different value should be set.'
      );
    }
    return this.elementStatus;
  }

  /**
   * Changes the state of the element to a specific one. If the state is already SHOW, it changes to HIDDEN.
   * @param status New state of type ElementStatusType.
   * @throws Error if the state is DEFAULT.
   */
  toggleByElementStatusType(status: ElementStatusType) {
    if (status === ElementStatusType.DEFAULT) {
      throw Error('The element state cannot be default.');
    }
    if (
      this.elementStatus() === ElementStatusType.SHOW &&
      status === ElementStatusType.SHOW
    ) {
      this.elementStatus.set(ElementStatusType.HIDDEN);
    } else {
      this.elementStatus.set(status);
    }
  }

  /**
   * Toggles a CSS class on an element and saves it in the history.
   * @param element HTML element to toggle the class on.
   * @param className Name of the class to toggle.
   * @throws Error if the class name is null or empty.
   */
  toggleByClassName(element: HTMLElement, className: string) {
    if (!className.trim()) {
      throw Error('The class name cannot be null or empty.');
    }

    element.classList.toggle(className);
    this.currentToggleClass = className;
    if (!this.elementsHistory.includes(element)) {
      this.elementsHistory.push(element);
    }
  }

  /**
   * Removes the active class from all elements stored in the history.
   * @throws Error if the history is empty.
   */
  removeActiveClassToAllElements() {
    if (this.elementsHistory.length <= 0) {
      throw Error('The element history is empty.');
    }

    this.elementsHistory.forEach((element) => {
      element.classList.remove(this.currentToggleClass);
    });
  }
}
