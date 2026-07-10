const fs = require('node:fs');
const http = require('node:http');
const { generateProfile } = require('../index');
const { getTheme } = require('../themes');

function previewPage(theme) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Profile Lab Preview</title>
  <style>
    body { margin: 0; padding: 32px; background: ${theme.colors.background}; font-family: system-ui, sans-serif; }
    main { max-width: 860px; margin: 0 auto; }
    img { display: block; width: 100%; height: auto; }
  </style>
</head>
<body>
  <main><img src="/profile.svg" alt="Profile SVG preview"></main>
</body>
</html>`;
}

function errorPage(error) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Profile Lab Error</title><pre>${error.message}</pre></html>`;
}

function createPreviewServer({ configPath, outputPath }) {
  return http.createServer((request, response) => {
    let result;

    try {
      result = generateProfile({ configPath, outputPath });
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(errorPage(error));
      return;
    }

    if (request.url === '/profile.svg') {
      response.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
      fs.createReadStream(result.outputPath).pipe(response);
      return;
    }

    if (request.url === '/' || request.url === '/index.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(previewPage(getTheme(result.config.theme.preset)));
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });
}

function startPreview({ configPath, outputPath, port = 4173 }) {
  const server = createPreviewServer({ configPath, outputPath });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Profile Lab preview: http://127.0.0.1:${port}`);
  });

  return server;
}

module.exports = { createPreviewServer, startPreview };
