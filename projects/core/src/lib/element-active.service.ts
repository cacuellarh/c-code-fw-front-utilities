import { Injectable } from '@angular/core';

@Injectable(
  
)
export class ElementActiveService {
  private currentActiveElement: HTMLElement | null = null;
  private elementsClickedRegister: HTMLElement[] = [];
  setActiveElement(element: HTMLElement, classActiveName: string) {
    this.deactivateElementsOtherThanOneClicked(classActiveName,element);

    this.currentActiveElement = element;
    this.currentActiveElement.classList.add(classActiveName);

    if(!this.elementsClickedRegister.includes(element)){
        this.elementsClickedRegister.push(element);
    }
  }

  private deactivateElementsOtherThanOneClicked(classActiveName: string, excludeElement: HTMLElement) {
  this.elementsClickedRegister.forEach(element => {
    if (element !== excludeElement) {
      element.classList.remove(classActiveName);
    }
  });
}
}
