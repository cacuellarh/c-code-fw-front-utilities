/** Formatting of a JSON file, detected on read so that saving does not rewrite every line. */
export interface JsonStyle {
  indent: string;
  eol: '\n' | '\r\n';
  finalNewline: boolean;
}

export const DEFAULT_JSON_STYLE: JsonStyle = { indent: '  ', eol: '\n', finalNewline: true };

export function detectJsonStyle(text: string): JsonStyle {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const indent = /\n([ \t]+)\S/.exec(text)?.[1] ?? DEFAULT_JSON_STYLE.indent;
  return { indent, eol, finalNewline: /\n$/.test(text) };
}

/**
 * Like `JSON.stringify(value, null, indent)`, but arrays of numbers or strings stay on one
 * line (`[101, 105, 117]`), as the sites' files have them.
 */
export function formatJson(value: unknown, style: JsonStyle = DEFAULT_JSON_STYLE): string {
  const out = write(value, '', style.indent);
  return (style.finalNewline ? out + '\n' : out).replace(/\n/g, style.eol);
}

function write(value: unknown, pad: string, indent: string): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((v) => v === null || typeof v !== 'object')) {
      return '[' + value.map((v) => JSON.stringify(v)).join(', ') + ']';
    }
    const inner = pad + indent;
    return '[\n' + value.map((v) => inner + write(v, inner, indent)).join(',\n') + '\n' + pad + ']';
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '{}';
    const inner = pad + indent;
    return (
      '{\n' +
      entries.map(([k, v]) => inner + JSON.stringify(k) + ': ' + write(v, inner, indent)).join(',\n') +
      '\n' +
      pad +
      '}'
    );
  }
  return JSON.stringify(value);
}
