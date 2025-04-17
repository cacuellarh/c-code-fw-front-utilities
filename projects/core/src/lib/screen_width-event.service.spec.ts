import { TestBed } from '@angular/core/testing';
import { ScreenWidthEventService } from './screen_width-event.service';
import { ScreenWidthType } from './types/screen_width-type';

describe('ScreenWidthEventService', () => {
  let service: ScreenWidthEventService;

  beforeEach(() => {
    // Mock the window object
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });

    TestBed.configureTestingModule({});
    service = TestBed.inject(ScreenWidthEventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return the correct screen width', () => {
    expect(service.getScreenWidth()).toBe(1024);
  });

  it('should return the correct screen height', () => {
    expect(service.getScreenHeight()).toBe(768);
  });

  it('should execute a function if screen width is less than or equal to the specified width', () => {
    const mockFunction = jasmine.createSpy('mockFunction');
    service.executeFuncByScreenWidth(mockFunction, 1024);
    expect(mockFunction).toHaveBeenCalled();
  });

  it('should execute a function if screen width is less than the specified width by expecific type', () => {
    const mockFunction = jasmine.createSpy('mockFunction');
    service.executeFuncByScreenWidth(mockFunction, ScreenWidthType.MD);
    expect(mockFunction).toHaveBeenCalled();
  })

  it('should not execute a function if screen width is greater than the specified width', () => {
    const mockFunction = jasmine.createSpy('mockFunction');
    service.executeFuncByScreenWidth(mockFunction, 800);
    expect(mockFunction).not.toHaveBeenCalled();
  });
});