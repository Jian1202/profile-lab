const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { generateProfile, validateProfile } = require('../src');

const fixture = (name) => path.join(__dirname, 'fixtures', name);

test('Unicode fixture 会转义 XML 文本并保留 Unicode 语义', () => {
  const result = validateProfile({ configPath: fixture('unicode.yaml') });

  assert.match(result.svg, /AI &amp; LLM &lt;Agent&gt; &quot;Test&quot;/);
  assert.match(result.svg, /中文 🚀 Profile/);
  assert.match(result.svg, /👩‍💻/u);
  assert.doesNotMatch(result.svg, /AI & LLM/);
});

test('容量 fixture 会报告首个超限字段的完整路径', () => {
  assert.throws(
    () => validateProfile({ configPath: fixture('invalid-capacity.yaml') }),
    /sections\[0\] "mission"\.data\.tracks\[0\]\.items.*received 7/,
  );
});

test('语言占比 fixture 会报告实际总和', () => {
  assert.throws(
    () => validateProfile({ configPath: fixture('invalid-language-total.yaml') }),
    /sections\[0\] "radar"\.data\.languages percentages must sum to 100, received 90/,
  );
});

test('新增约束失败时 generate 不覆盖已有 SVG', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-overflow-'));
  const outputPath = path.join(directory, 'profile.svg');
  fs.writeFileSync(outputPath, 'known-good-svg', 'utf8');

  try {
    assert.throws(
      () => generateProfile({ configPath: fixture('invalid-capacity.yaml'), outputPath }),
      /received 7/,
    );
    assert.equal(fs.readFileSync(outputPath, 'utf8'), 'known-good-svg');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
