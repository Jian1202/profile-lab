const DEFAULT_ELLIPSIS = '…';
const graphemeSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

function splitGraphemes(value) {
  return [...graphemeSegmenter.segment(String(value))].map(({ segment }) => segment);
}

function isWideCodePoint(codePoint) {
  return codePoint >= 0x1100 && (
    codePoint <= 0x115f
    || codePoint === 0x2329
    || codePoint === 0x232a
    || (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f)
    || (codePoint >= 0xac00 && codePoint <= 0xd7a3)
    || (codePoint >= 0xf900 && codePoint <= 0xfaff)
    || (codePoint >= 0xfe10 && codePoint <= 0xfe19)
    || (codePoint >= 0xfe30 && codePoint <= 0xfe6f)
    || (codePoint >= 0xff00 && codePoint <= 0xff60)
    || (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    || (codePoint >= 0x1f300 && codePoint <= 0x1faff)
    || (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  );
}

function weightFactor(fontWeight) {
  const numeric = typeof fontWeight === 'string'
    ? ({ normal: 400, medium: 500, semibold: 600, bold: 700 }[fontWeight] || Number(fontWeight))
    : fontWeight;

  if (numeric >= 700) return 1.04;
  if (numeric >= 600) return 1.02;
  return 1;
}

function characterFactor(character, family = '') {
  const codePoint = character.codePointAt(0);

  if (/\p{Mark}/u.test(character) || codePoint === 0x200d || codePoint === 0xfe0f) return 0;
  if (/\s/u.test(character)) return 0.3;
  if (isWideCodePoint(codePoint) || /\p{Extended_Pictographic}/u.test(character)) return 1;
  if (/monospace|Consolas|Mono/i.test(family)) return 0.58;
  if (/\p{Number}/u.test(character)) return 0.58;
  if (/\p{Uppercase_Letter}/u.test(character)) return 0.65;
  if (/\p{Lowercase_Letter}/u.test(character)) return 0.56;
  if (/\p{Punctuation}/u.test(character)) return 0.48;
  return 0.62;
}

function estimateTextWidth(value, { fontSize = 16, fontWeight = 400, family = '' } = {}) {
  const factor = splitGraphemes(value).reduce(
    (total, character) => total + characterFactor(character, family),
    0,
  );

  return factor * fontSize * weightFactor(fontWeight);
}

function fitWithEllipsis(value, options) {
  const { maxWidth, ellipsis = DEFAULT_ELLIPSIS } = options;
  const characters = splitGraphemes(value);

  while (characters.length && estimateTextWidth(`${characters.join('')}${ellipsis}`, options) > maxWidth) {
    characters.pop();
  }

  if (!characters.length && estimateTextWidth(ellipsis, options) > maxWidth) return '';
  return `${characters.join('').trimEnd()}${ellipsis}`;
}

function truncateText(value, options) {
  const text = String(value);
  const originalWidth = estimateTextWidth(text, options);

  if (originalWidth <= options.maxWidth) {
    return { text, truncated: false, originalWidth, finalWidth: originalWidth };
  }

  const fitted = fitWithEllipsis(text, options);
  return {
    text: fitted,
    truncated: true,
    originalWidth,
    finalWidth: estimateTextWidth(fitted, options),
  };
}

function tokenize(value) {
  const tokens = [];
  let word = '';

  const flushWord = () => {
    if (word) tokens.push(word);
    word = '';
  };

  for (const character of splitGraphemes(value)) {
    if (character === '\n') {
      flushWord();
      tokens.push('\n');
    } else if (/\s/u.test(character)) {
      flushWord();
      tokens.push(' ');
    } else if (isWideCodePoint(character.codePointAt(0)) || /\p{Extended_Pictographic}/u.test(character)) {
      flushWord();
      tokens.push(character);
    } else {
      word += character;
    }
  }

  flushWord();
  return tokens;
}

function splitToken(token, options) {
  const parts = [];
  let current = '';

  for (const character of splitGraphemes(token)) {
    if (current && estimateTextWidth(`${current}${character}`, options) > options.maxWidth) {
      parts.push(current);
      current = character;
    } else {
      current += character;
    }
  }

  if (current) parts.push(current);
  return parts;
}

function wrapText(value, options) {
  const lines = [];
  let current = '';

  const pushCurrent = () => {
    lines.push(current.trimEnd());
    current = '';
  };

  for (const token of tokenize(value)) {
    if (token === '\n') {
      pushCurrent();
      continue;
    }

    if (token === ' ' && !current) continue;
    const candidate = `${current}${token}`;
    if (estimateTextWidth(candidate, options) <= options.maxWidth) {
      current = candidate;
      continue;
    }

    if (current) pushCurrent();
    if (token === ' ') continue;

    const parts = splitToken(token, options);
    lines.push(...parts.slice(0, -1));
    current = parts.at(-1) || '';
  }

  if (current || !lines.length) pushCurrent();

  const maxLines = options.maxLines ?? Number.POSITIVE_INFINITY;
  if (lines.length <= maxLines) return { lines, truncated: false };

  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = fitWithEllipsis(visible[maxLines - 1], options);
  return { lines: visible, truncated: true };
}

module.exports = { estimateTextWidth, truncateText, wrapText };
