import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, fromEvent } from 'rxjs';
import { ScreenWidthType } from './types/screen_width-type';
import { isPlatformBrowser } from '@angular/common';

/**
 * Tailwind CSS Breakpoints:
 * - xs: < 640px (Extra small, below Tailwind's `sm`)
 * - sm: 640px (Small screens)
 * - md: 768px (Medium screens)
 * - lg: 1024px (Large screens)
 * - xl: 1280px (Extra large screens)
 * - 2xl: 1536px (2x Extra large screens)
 */

// @Service: ScreenWidthEventService
@Injectable({
  providedIn: 'root',
})
export class ScreenWidthEventService {
  // @Property: Stores the current screen width
  private screenWidth: number = window.innerWidth;

  // @Property: Stores the current screen height
  private screenHeight: number = window.innerHeight;

  // @Property: Platform ID for browser/server detection
  private platformId = inject(PLATFORM_ID);

  // @Property: DestroyRef for managing subscriptions
  private destroyRef = inject(DestroyRef);

  /**
   * @Constructor
   * @Description: Initializes the screen width and height if running in a browser environment
   */
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.screenWidth = window.innerWidth;
      this.screenHeight = window.innerHeight;
    }
  }

  /**
   * @Method: getScreenWidth
   * @Description: Returns the current screen width
   * @Returns: number - The current screen width
   * @Throws: Error if called outside of a browser environment
   */
  public getScreenWidth(): number {
    if (isPlatformBrowser(this.platformId)) {
      return this.screenWidth;
    }
    throw new Error(
      'getScreenWidth can only be called in a browser environment.'
    );
  }

  /**
   * @Method: getScreenHeight
   * @Description: Returns the current screen height
   * @Returns: number - The current screen height
   * @Throws: Error if called outside of a browser environment
   */
  public getScreenHeight(): number {
    if (isPlatformBrowser(this.platformId)) {
      return this.screenHeight;
    }
    throw new Error(
      'getScreenHeight can only be called in a browser environment.'
    );
  }

  /**
   * @Method: executeFuncByScreenWidth
   * @Description: Executes a function if the screen width is less than or equal to the specified width
   * @Param: func - The function to execute
   * @Param: width - The maximum screen width to trigger the function (can be a ScreenWidthType or a number)
   */
  public executeFuncByScreenWidth(
    func: () => void,
    width: ScreenWidthType
  ): void;

  public executeFuncByScreenWidth(func: () => void, width: number): void;

  public executeFuncByScreenWidth(
    func: () => void,
    width: ScreenWidthType | number
  ): void {
    if (this.screenWidth <= width) {
      // Calls the function immediately only to pass tests, as onResize requires a browser to trigger fromEvent(window, 'resize').
      this.onResize(func);
    }
  }

  /**
   * @Method: onResize
   * @Description: Subscribes to the window resize event and executes the provided function after a debounce period
   * @Param: func - The function to execute on resize
   * @Param: debounceTimeValue - The debounce time in milliseconds (default: 200ms)
   * @Throws: Error if called outside of a browser environment
   */
  private onResize(func: () => void, debounceTimeValue: number = 200): void {
    if (isPlatformBrowser(this.platformId)) {
      fromEvent(window, 'resize')
        .pipe(
          debounceTime(debounceTimeValue),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.screenWidth = window.innerWidth;
          this.screenHeight = window.innerHeight;
          func();
        });
    } else {
      throw new Error('onResize can only be called in a browser environment.');
    }
  }
}
