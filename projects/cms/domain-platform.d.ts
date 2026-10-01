/*
 * The only platform APIs the pure layers (projects/cms/src/domain and @cc/ui-domain) may use.
 * Used by tsconfig.domain.json instead of lib "DOM" and @types/node, so everything else
 * (window, document, fetch, storage, timers, process…) is a type error there.
 *
 * Each API here is a web standard that behaves the same in the browser and in Node, with no I/O.
 * Adding one is an architecture decision: check it exists in both, then update
 * .claude/rules/cms-architecture.md. When the domain needs I/O, add a port in domain/ports.ts.
 */

/** Binary data passed through the ports (uploads, files). The domain never reads it itself. */
type BlobPart = string | ArrayBuffer | ArrayBufferView | Blob;
interface Blob {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  slice(start?: number, end?: number, contentType?: string): Blob;
}
declare var Blob: {
  prototype: Blob;
  new (parts?: BlobPart[], options?: { type?: string }): Blob;
};

/** URL parsing (WHATWG URL). */
interface URLSearchParams {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  toString(): string;
}
declare var URLSearchParams: {
  prototype: URLSearchParams;
  new (init?: string | Record<string, string> | [string, string][]): URLSearchParams;
};
interface URL {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  readonly origin: string;
  pathname: string;
  protocol: string;
  search: string;
  readonly searchParams: URLSearchParams;
  toString(): string;
}
declare var URL: {
  prototype: URL;
  new (url: string | URL, base?: string | URL): URL;
};

declare function structuredClone<T>(value: T): T;
declare function atob(data: string): string;
declare function btoa(data: string): string;
