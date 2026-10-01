import { MediaError } from '../../domain/media';
import { ConflictError, PublishNotConfiguredError } from '../../domain/site';

/**
 * What to tell the person when something fails. Clients get plain words; admins also get the
 * technical detail (missing files, unknown scopes…), which they can act on.
 */
export function errorMessage(error: unknown, admin: boolean): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  if (code === 'permission-denied') return 'No tienes acceso a este sitio. Escríbenos si crees que es un error.';
  if (code === 'unavailable' || code === 'auth/network-request-failed') return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  if (error instanceof PublishNotConfiguredError) {
    return admin ? error.message : 'La publicación no está activada en este sitio. Escríbenos y lo resolvemos.';
  }
  // These are written for the person editing.
  if (error instanceof ConflictError || error instanceof MediaError) return error.message;
  const detail = error instanceof Error ? error.message : String(error);
  return admin ? detail : 'Algo salió mal. Intenta de nuevo y, si sigue pasando, escríbenos.';
}

/** "hace 5 min", "hace 2 h", "ayer", "12 sep". */
export function relativeDate(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  if (hours < 48) return 'ayer';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

/** "12 sep. 2026, 10:30", for exact dates in tooltips. */
export function fullDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
