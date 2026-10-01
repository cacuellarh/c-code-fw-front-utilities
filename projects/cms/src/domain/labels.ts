/*
 * Words the CMS builds from a collection's names, with Spanish gender and plural:
 * "Nuevo plan" / "Nueva foto", "Aún no hay fotos", "12 fotos".
 */
import { CollectionDef } from './schema';

type Named = Pick<CollectionDef, 'singular' | 'feminine' | 'plural'>;

/** Plural of the singular name: plan → planes, foto → fotos, popup → popups. */
export function pluralOf(def: Named): string {
  if (def.plural) return def.plural;
  const word = def.singular;
  if (/[aeiouáéó]$/i.test(word) || /p$/i.test(word)) return `${word}s`;
  if (/z$/i.test(word)) return `${word.slice(0, -1)}ces`;
  return `${word}es`;
}

/** Label of the button that adds an entry: "Nuevo plan", "Nueva foto". */
export function newLabel(def: Named): string {
  return `${def.feminine ? 'Nueva' : 'Nuevo'} ${def.singular}`;
}

/** "un plan" / "una foto". */
export function withArticle(def: Named): string {
  return `${def.feminine ? 'una' : 'un'} ${def.singular}`;
}

/** Count with the right form: "1 plan", "12 fotos". */
export function countOf(def: Named, n: number): string {
  return `${n} ${n === 1 ? def.singular : pluralOf(def)}`;
}

/** Title of an empty list: "Aún no hay planes". */
export function emptyTitle(def: Named): string {
  return `Aún no hay ${pluralOf(def)}`;
}

/** Text of the editor when nothing is selected: "Elige un plan para editarlo." */
export function pickPrompt(def: Named): string {
  return `Elige ${withArticle(def)} para ${def.feminine ? 'editarla' : 'editarlo'}.`;
}

/** Line under the empty title: "Crea el primero…" / "Crea la primera…". */
export function emptyText(def: Named): string {
  return `Crea ${def.feminine ? 'la primera' : 'el primero'} y aparecerá en tu sitio al publicar.`;
}
