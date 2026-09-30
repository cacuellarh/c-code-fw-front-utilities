import { Type } from '@angular/core';
import { PlanPreviewComponent } from './spa-plan/plan-preview.component';

/**
 * Preview components by the key a collection declares in its scope (`preview: 'spa.plan'`).
 * Each one receives the inputs `item` and `ctx`.
 */
export const PREVIEWS: Record<string, Type<unknown>> = {
  'spa.plan': PlanPreviewComponent,
};
