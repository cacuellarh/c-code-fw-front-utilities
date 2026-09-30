import { ScopeDef } from '../schema';
import { SPA_SCOPE } from './spa/spa.scope';

/**
 * Kinds of site the CMS can manage. To support a new one (restaurant, hotel…), add a folder
 * with its `ScopeDef` and list it here. See README.md in this folder.
 */
export const SCOPES: ScopeDef[] = [SPA_SCOPE];

export function findScope(id: string): ScopeDef | undefined {
  return SCOPES.find((scope) => scope.id === id);
}
