/**
 * Turns a text into a URL-safe slug: "PLAN FLOR DE LOTTO 3" -> "plan-flor-de-lotto-3".
 * Accents are removed, so "Jacuzzi Mágico" -> "jacuzzi-magico".
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "PLAN GARDENIA" -> "Plan Gardenia". */
export function titleCase(text: string): string {
  return text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/** Cuts a text at the last whole word that fits in `max` characters and adds "…". */
export function truncateText(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max - 1);
  return text.slice(0, cut > 0 ? cut : max - 1) + '…';
}

/**
 * Builds a WhatsApp chat link.
 * @param phone Number with country code, with or without "+" and spaces: "57 310 494 8884".
 * @param message Pre-filled message, optional.
 */
export function whatsappUrl(phone: string, message?: string): string {
  const params = new URLSearchParams({ phone: phone.replace(/\D/g, '') });
  if (message) params.set('text', message);
  params.set('type', 'phone_number');
  params.set('app_absent', '0');
  return `https://api.whatsapp.com/send/?${params.toString()}`;
}
