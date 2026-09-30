import { planSlug } from '@cc/ui-domain';
import { Entry, ScopeContext } from '../../schema';

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
 * A plan keeps its `lastmod` unless it changed in this session; new or edited plans get today.
 * New entries copy the format of an existing entry (one line or several, with priority).
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

  const changed = changedPlanIds(ctx);
  const planBlocks = ctx.data('plans').map((plan) => {
    const loc = planPrefix + planSlug(String(plan['name'] ?? ''));
    const previous = oldPlans.get(loc);
    if (previous && !changed.has(plan['id'])) return previous;
    const base = (previous ?? template).replace(/<loc>[^<]*<\/loc>/, `<loc>${loc}</loc>`);
    return /<lastmod>/.test(base) ? base.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`) : base;
  });

  return head + [...kept, ...planBlocks].join(separator) + tail;
}

/** Ids of the plans that are new or differ from the file on disk. */
function changedPlanIds(ctx: ScopeContext): Set<unknown> {
  const before = new Map((ctx.original?.('plans') ?? []).map((plan: Entry) => [plan['id'], JSON.stringify(plan)]));
  return new Set(
    ctx
      .data('plans')
      .filter((plan) => before.get(plan['id']) !== JSON.stringify(plan))
      .map((plan) => plan['id'])
  );
}

function isoToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
