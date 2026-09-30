/*
 * c-code-content: brings a site's content from Firestore into its folder before the build.
 *
 *   c-code-content pull --site xora-spa --project c-code-bf1fd [--dir .]
 *
 * Writes the JSON files of each collection, the files the site's scope generates
 * (prerender routes, sitemap) and the image library (src/assets/cms). If Firestore cannot be
 * read, it exits with an error so the build fails and the last published version stays online.
 */
import { writeMediaFolder } from '../domain/media';
import { writeSiteFolder } from '../domain/site';
import { fetchSite, FirestoreRestMediaStore } from './firestore-rest-reader';
import { NodeSiteFiles } from './node-site-files';

const HELP = `Uso: c-code-content pull --site <id> --project <firebase-project> [--dir <carpeta>]

  --site      id del sitio en el CMS (por ejemplo xora-spa)
  --project   id del proyecto de Firebase (por ejemplo c-code-bf1fd)
  --dir       carpeta del sitio; por defecto la actual`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const flags = parseFlags(rest);
  if (command !== 'pull' || !flags['site'] || !flags['project']) {
    console.error(HELP);
    return command === '--help' || command === '-h' ? 0 : 1;
  }
  const started = Date.now();
  const site = await fetchSite(flags['project'], flags['site']);
  const files = new NodeSiteFiles(flags['dir'] ?? process.cwd());
  const written = await writeSiteFolder(files, site);
  const media = await writeMediaFolder(files, new FirestoreRestMediaStore(flags['project']), site.id);
  const counts = site.collections.map((c) => `${c.id} ${c.items.length}`).join(', ');
  console.log(`c-code-content: ${site.name} (${counts}) en ${Date.now() - started} ms`);
  console.log(written.length ? written.map((path) => `  actualizado ${path}`).join('\n') : '  sin cambios');
  console.log(`  imágenes: ${media.images} (${media.files} archivos en src/assets/cms)`);
  return 0;
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const match = /^--([\w-]+)(?:=(.*))?$/.exec(args[i]);
    if (!match) continue;
    flags[match[1]] = match[2] ?? args[++i] ?? '';
  }
  return flags;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    console.error(`c-code-content: ${(error as Error).message}`);
    process.exit(1);
  }
);
