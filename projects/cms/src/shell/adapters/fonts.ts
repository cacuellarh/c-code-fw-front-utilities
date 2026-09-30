/** Adds a site's font stylesheets to the page once, for the previews. */
export function loadFonts(urls: string[]): void {
  for (const url of urls) {
    if (document.querySelector(`link[data-site-font="${CSS.escape(url)}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.dataset['siteFont'] = url;
    document.head.appendChild(link);
  }
}
