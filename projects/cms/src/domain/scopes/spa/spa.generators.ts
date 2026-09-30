import { planSlug } from '@cc/ui-domain';
import { ScopeContext } from '../../schema';

/** Where the site shows a plan's page: `/planes/` + slug. `cms.json` → options.planRoute. */
export function planRoute(ctx: ScopeContext): string {
  const route = ctx.manifest.options?.['planRoute'];
  return typeof route === 'string' ? route : '/planes/';
}

function planPaths(ctx: ScopeContext): string[] {
  const prefix = planRoute(ctx);
  return ctx.data('plans').map((plan) => prefix + planSlug(String(plan['name'] ?? '')));
}

/**
 * Prerender routes file: keeps the site's own routes and replaces the plan routes with the
 * current plans, so a new plan gets its prerendered page on the next build.
 */
export function generateRoutes(current: string | null, ctx: ScopeContext): string | null {
  if (current === null) return null;
  const eol = current.includes('\r\n') ? '\r\n' : '\n';
  const prefix = planRoute(ctx);
  const lines = current.split(/\r?\n/).filter((line) => line.trim() !== '');
  const kept = lines.filter((line) => !line.trim().startsWith(prefix));
  return [...kept, ...planPaths(ctx)].join(eol) + (/\n$/.test(current) ? eol : '');
}

/**
 * sitemap.xml: keeps the entries of other pages as they are and rewrites the plan entries.
 * Plan entries get the date of the last save of the plans (today if it is unknown), unless
 * they already have a later one. New entries copy the format of an existing entry
 * (one line or several, with priority).
 */
export function generateSitemap(current: string | null, ctx: ScopeContext, today = isoToday()): string | null {
  const siteUrl = ctx.manifest.siteUrl?.replace(/\/+$/, '');
  if (current === null || !siteUrl) return null;

  const blocks = [...current.matchAll(/<url>[\s\S]*?<\/url>/g)];
  if (blocks.length === 0) return null;
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  const head = current.slice(0, first.index);
  const tail = current.slice(last.index! + last[0].length);
  const separator = blocks.length > 1 ? current.slice(first.index! + first[0].length, blocks[1].index) : '\n  ';

  const planPrefix = siteUrl + planRoute(ctx);
  const locOf = (block: string) => /<loc>\s*([^<]+?)\s*<\/loc>/.exec(block)?.[1] ?? '';
  const isPlan = (block: string) => locOf(block).startsWith(planPrefix);
  const kept = blocks.map((b) => b[0]).filter((b) => !isPlan(b));
  const oldPlans = new Map(blocks.map((b) => b[0]).filter(isPlan).map((b) => [locOf(b), b]));
  const template = oldPlans.values().next().value ?? kept[kept.length - 1];
  const saved = ctx.updatedAt?.('plans')?.slice(0, 10) ?? today;

  const planBlocks = ctx.data('plans').map((plan) => {
    const loc = planPrefix + planSlug(String(plan['name'] ?? ''));
    const previous = oldPlans.get(loc);
    const base = (previous ?? template).replace(/<loc>[^<]*<\/loc>/, `<loc>${loc}</loc>`);
    const before = /<lastmod>([^<]*)<\/lastmod>/.exec(previous ?? '')?.[1] ?? '';
    const date = before > saved ? before : saved;
    return base.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${date}</lastmod>`);
  });

  return head + [...kept, ...planBlocks].join(separator) + tail;
}

function isoToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
