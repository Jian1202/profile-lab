const assert = require('node:assert/strict');
const test = require('node:test');
const { estimateTextWidth, truncateText, wrapText } = require('../src/text');
const { svgDocument, text } = require('../src/utils/svg');

const base = { fontSize: 16, fontWeight: 400, family: 'Inter, sans-serif' };

test('文本宽度估算区分英文、中文、Emoji、空格和字重', () => {
  assert.ok(estimateTextWidth('Hello', base) > 0);
  assert.ok(estimateTextWidth('中文', base) > estimateTextWidth('ab', base));
  assert.ok(estimateTextWidth('AI中文', base) > estimateTextWidth('AI', base));
  assert.ok(estimateTextWidth('🚀', base) > estimateTextWidth('a', base));
  assert.ok(estimateTextWidth(' ', base) < estimateTextWidth('a', base));
  assert.ok(estimateTextWidth('Profile', { ...base, fontWeight: 700 }) > estimateTextWidth('Profile', base));
});

test('文本宽度估算具有确定性', () => {
  const input = 'AI + 前端 🚀';
  assert.equal(estimateTextWidth(input, base), estimateTextWidth(input, base));
});

test('单行截断保留短文本并安全截断 Unicode', () => {
  const short = truncateText('Profile Lab', { ...base, maxWidth: 200 });
  assert.deepEqual(short, {
    text: 'Profile Lab',
    truncated: false,
    originalWidth: short.originalWidth,
    finalWidth: short.originalWidth,
  });

  const long = truncateText('这是一个很长的标题🚀🚀🚀', { ...base, maxWidth: 90 });
  assert.equal(long.truncated, true);
  assert.match(long.text, /…$/u);
  assert.ok(long.finalWidth <= 90);
  assert.doesNotMatch(long.text, /[\uD800-\uDBFF]$/u);
});

test('多行换行优先保留英文单词并支持中文和长单词', () => {
  const english = wrapText('Profile Lab renders stable SVG output', { ...base, maxWidth: 120, maxLines: 4 });
  assert.equal(english.lines[0], 'Profile Lab');
  assert.equal(english.lines.join(' '), 'Profile Lab renders stable SVG output');

  const chinese = wrapText('中文内容可以安全按字符换行', { ...base, maxWidth: 64, maxLines: 4 });
  assert.ok(chinese.lines.length > 1);
  chinese.lines.forEach((line) => assert.ok(estimateTextWidth(line, base) <= 64));

  const longWord = wrapText('Supercalifragilisticexpialidocious', { ...base, maxWidth: 60, maxLines: 10 });
  assert.ok(longWord.lines.length > 1);
  assert.equal(longWord.lines.join(''), 'Supercalifragilisticexpialidocious');
});

test('多行超限时在最后一行添加省略号', () => {
  const result = wrapText('one two three four five six seven', { ...base, maxWidth: 70, maxLines: 2 });
  assert.equal(result.truncated, true);
  assert.equal(result.lines.length, 2);
  assert.match(result.lines[1], /…$/u);
  result.lines.forEach((line) => assert.ok(estimateTextWidth(line, base) <= 70));
});

test('SVG DSL 统一转义 XML 特殊字符', () => {
  const value = `AI & LLM <Agent> "Test" 'Lab'`;
  const svg = svgDocument({
    width: 100,
    height: 40,
    title: value,
    description: value,
    children: text(value, { x: 0, y: 20, 'data-label': value }),
  });

  assert.doesNotMatch(svg, /AI & LLM/);
  assert.match(svg, /AI &amp; LLM &lt;Agent&gt; &quot;Test&quot; &apos;Lab&apos;/);
  assert.match(svg, /data-label="AI &amp; LLM &lt;Agent&gt; &quot;Test&quot; 'Lab'"/);
});
