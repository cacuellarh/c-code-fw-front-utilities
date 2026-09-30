/*
 * Framework-free part of @c-code/c-code-fw/ui: models and pure utilities, with no Angular
 * imports. Tools that must stay framework-agnostic (the CMS domain) import from here so they
 * use exactly the same slugs, prices and categories as the sites.
 * `public-api.ts` re-exports all of it for the Angular consumers.
 */
export * from './lib/models/plan.models';
export * from './lib/models/ui.models';
export * from './lib/utils/text.utils';
export * from './lib/utils/plan.utils';
