// Builds a site's index.html from its content. Shared by the publish
// function and the one-off generator. Files prefixed with "_" in /api
// are not exposed as Vercel functions.

const WA_SYMBOL = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="wa" viewBox="0 0 24 24"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43m8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.6l6.01-1.58a11.33 11.33 0 0 0 5.43 1.38h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02"/></symbol></svg>';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function photoUrl(v, slug) {
  if (!v) return '';
  if (/^(https?:|\/)/.test(v)) return v;
  return `/${slug}/${v}`;
}

function buildPage(slug, content) {
  const seo = content.seo || {};
  const name = content.name || '';
  const fill = v => String(v || '').replace(/\{nombre\}/g, name);
  const title = fill(seo.title) || name || 'Masajes';
  const desc = fill(seo.description);
  const ogImage = photoUrl((content.hero || {}).photo, slug);
  // Inline JSON must not be able to close the <script> tag.
  const json = JSON.stringify({ slug, content })
    .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#15070a">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">\n` : ''}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/_site/site.css">
</head>
<body>
${WA_SYMBOL}
<div id="app"></div>
<script type="application/json" id="site-content">${json}</script>
<script src="/_site/site.js"></script>
</body>
</html>
`;
}

module.exports = { buildPage, WA_SYMBOL };
