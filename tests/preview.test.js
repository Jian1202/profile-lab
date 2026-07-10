const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createPreviewServer } = require('../src/preview/server');

test('Preview 可以返回页面与实时生成的 SVG', async () => {
  const root = path.resolve(__dirname, '..');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-preview-'));
  const server = createPreviewServer({
    configPath: path.join(root, 'examples', 'minimal', 'profile.yaml'),
    outputPath: path.join(directory, 'profile.svg'),
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const [page, svg] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/`),
      fetch(`http://127.0.0.1:${port}/profile.svg`),
    ]);

    assert.equal(page.status, 200);
    assert.match(await page.text(), /Profile Lab Preview/);
    assert.equal(svg.status, 200);
    assert.match(await svg.text(), /<svg/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
