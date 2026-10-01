import { MediaItem, MediaStore, MediaVariant, StoredCollection, StoredSite } from '../domain/ports';
import { Entry } from '../domain/schema';

/**
 * Reads a site from Firestore through its public REST API. No credentials: the rules allow
 * anyone to read the content, which is the same content the public site shows.
 */
export async function fetchSite(projectId: string, siteId: string, database = '(default)'): Promise<StoredSite> {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${database}/documents/sites/${encodeURIComponent(siteId)}`;
  const site = await getJson(base);
  if (!site) throw new Error(`El sitio "${siteId}" no existe en el proyecto ${projectId}.`);
  const data = fields(site);

  const collections: StoredCollection[] = [];
  let pageToken = '';
  do {
    const page = await getJson(`${base}/collections?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`);
    for (const doc of (page?.['documents'] as FirestoreDoc[] | undefined) ?? []) {
      const c = fields(doc);
      collections.push({
        id: doc.name.split('/').pop()!,
        items: (c['items'] as Entry[]) ?? [],
        version: Number(c['version'] ?? 0),
        updatedAt: c['updatedAt'] as string | undefined,
      });
    }
    pageToken = (page?.['nextPageToken'] as string | undefined) ?? '';
  } while (pageToken);

  return {
    id: siteId,
    name: String(data['name'] ?? siteId),
    scope: String(data['scope'] ?? ''),
    manifest: data['manifest'] as StoredSite['manifest'],
    updatedAt: data['updatedAt'] as string | undefined,
    publishedAt: data['publishedAt'] as string | undefined,
    collections,
  };
}

interface FirestoreDoc {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

type FirestoreValue = Record<string, unknown>;

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore respondió ${response.status} en ${url}: ${await response.text()}`);
  return response.json();
}

function fields(doc: { fields?: Record<string, FirestoreValue> }): Record<string, unknown> {
  return Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, decode(v)]));
}

/** Firestore's typed JSON ({ stringValue: "x" }, { integerValue: "3" }…) to plain values. */
export function decode(value: FirestoreValue): unknown {
  if ('stringValue' in value) return value['stringValue'];
  if ('integerValue' in value) return Number(value['integerValue']);
  if ('doubleValue' in value) return Number(value['doubleValue']);
  if ('booleanValue' in value) return value['booleanValue'];
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value['timestampValue'];
  if ('bytesValue' in value) return new Uint8Array(Buffer.from(String(value['bytesValue']), 'base64'));
  if ('arrayValue' in value) {
    return (((value['arrayValue'] as { values?: FirestoreValue[] }).values) ?? []).map(decode);
  }
  if ('mapValue' in value) return fields(value['mapValue'] as { fields?: Record<string, FirestoreValue> });
  throw new Error(`Tipo de Firestore no soportado: ${Object.keys(value).join(', ')}`);
}

/**
 * Read-only `MediaStore` over the public REST API, for the build: lists the site's image
 * library and reads each variant.
 */
export class FirestoreRestMediaStore implements MediaStore {
  constructor(private projectId: string, private database = '(default)') {}

  async list(siteId: string): Promise<MediaItem[]> {
    const items: MediaItem[] = [];
    let pageToken = '';
    do {
      const page = await getJson(`${this.base(siteId)}/media?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`);
      for (const doc of (page?.['documents'] as FirestoreDoc[] | undefined) ?? []) {
        const f = fields(doc);
        items.push({
          id: doc.name.split('/').pop()!,
          name: String(f['name'] ?? ''),
          kind: f['kind'] as MediaItem['kind'],
          width: Number(f['width'] ?? 0),
          height: Number(f['height'] ?? 0),
          bytes: Number(f['bytes'] ?? 0),
          variants: (f['variants'] as MediaVariant[]) ?? [],
          preview: (f['preview'] as Uint8Array) ?? new Uint8Array(),
          createdAt: String(f['createdAt'] ?? ''),
          source: f['source'] as string | undefined,
        });
      }
      pageToken = (page?.['nextPageToken'] as string | undefined) ?? '';
    } while (pageToken);
    return items;
  }

  async read(siteId: string, id: string, variant: MediaVariant): Promise<Uint8Array | null> {
    const doc = await getJson(`${this.base(siteId)}/media/${encodeURIComponent(id)}/data/${variant}`);
    return doc ? ((fields(doc as { fields?: Record<string, FirestoreValue> })['bytes'] as Uint8Array | undefined) ?? null) : null;
  }

  async save(): Promise<void> {
    throw new Error('El build solo lee la biblioteca de imágenes.');
  }

  async remove(): Promise<void> {
    throw new Error('El build solo lee la biblioteca de imágenes.');
  }

  private base(siteId: string): string {
    return `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.database}/documents/sites/${encodeURIComponent(siteId)}`;
  }
}
