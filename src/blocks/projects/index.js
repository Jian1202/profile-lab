const { group, line, rect, text } = require('../../utils/svg');
const { estimateTextWidth, truncateText, wrapText } = require('../../text');

const projectTagLayout = {
  maxWidth: 184,
  fontSize: 10,
  separator: ' · ',
  oneLineY: 194,
  twoLineY: [188, 202],
};

function layoutTagLines(tags, options) {
  if (options.maxLines === 1) {
    const fitted = truncateText(tags.join(options.separator), options);
    return [{ text: fitted.text, truncated: fitted.truncated }];
  }

  const lines = [];
  let current = '';
  let truncated = false;

  for (const tag of tags) {
    const fittedTag = truncateText(tag, options);
    const candidate = current ? `${current}${options.separator}${fittedTag.text}` : fittedTag.text;

    if (estimateTextWidth(candidate, options) <= options.maxWidth) {
      current = candidate;
      truncated ||= fittedTag.truncated;
      continue;
    }

    if (current && lines.length < options.maxLines - 1) {
      lines.push({ text: current, truncated });
      current = fittedTag.text;
      truncated = fittedTag.truncated;
      continue;
    }

    const fallback = truncateText(candidate, options);
    current = fallback.text;
    truncated = true;
  }

  if (current) lines.push({ text: current, truncated });
  return lines;
}

function measure(_section, { layout }) {
  return { height: layout.blockHeights.projects };
}

function render(section, { theme, layout, offsetY, height }) {
  const { data } = section;
  const { colors, fonts } = theme;
  const { width, gutter } = layout.canvas;
  const cards = data.entries.map((entry, index) => {
    const x = 60 + index * 250;
    const accent = colors[entry.color];
    const name = truncateText(entry.name, { maxWidth: 203, fontSize: 14, fontWeight: 700, family: fonts.mono }).text;
    const description = wrapText(entry.description, {
      maxWidth: 202,
      maxLines: 2,
      fontSize: 13,
      family: fonts.display,
    });
    const descriptionY = description.lines.length > 1 ? 158 : 166;
    const descriptionLines = description.lines.map((lineText, lineIndex) => text(lineText, {
      x: x + 18,
      y: descriptionY + lineIndex * 16,
      fill: colors.text,
      'font-family': fonts.display,
      'font-size': 13,
    }));
    const tagLines = layoutTagLines(entry.tags, {
      maxWidth: projectTagLayout.maxWidth,
      maxLines: description.lines.length === 1 ? 2 : 1,
      fontSize: projectTagLayout.fontSize,
      family: fonts.mono,
      separator: projectTagLayout.separator,
    });
    const tagY = tagLines.length === 1 ? [projectTagLayout.oneLineY] : projectTagLayout.twoLineY;
    const tags = tagLines.map((tag, tagIndex) => text(tag.text, {
      x: x + 18,
      y: tagY[tagIndex],
      fill: colors.text,
      opacity: 0.6,
      'font-family': fonts.mono,
      'font-size': 10,
    }));

    return group([
      rect({ x, y: 76, width: 220, height: 136, rx: 8, fill: colors.background, stroke: colors.border }),
      line({ x1: x + 18, y1: 96, x2: x + 202, y2: 96, stroke: accent, 'stroke-width': 4, 'stroke-linecap': 'round' }),
      text(name, { x: x + 18, y: 130, fill: colors.primary, 'font-family': fonts.mono, 'font-size': 14, 'font-weight': 700 }),
      descriptionLines,
      tags,
    ]);
  });

  return group([
    rect({ width, height, fill: colors.background }),
    line({ x1: gutter, y1: 0, x2: gutter, y2: height, stroke: colors.border }),
    line({ x1: width - gutter, y1: 0, x2: width - gutter, y2: height, stroke: colors.border }),
    text(truncateText(data.title, { maxWidth: 520, fontSize: 28, fontWeight: 750, family: fonts.display }).text, { x: 60, y: 44, fill: colors.primary, 'font-family': fonts.display, 'font-size': 28, 'font-weight': 750 }),
    text(truncateText(data.eyebrow, { maxWidth: 190, fontSize: 11, family: fonts.mono }).text, { x: 800, y: 42, fill: colors.text, opacity: 0.62, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
    cards,
  ], { id: 'projects', transform: `translate(0 ${offsetY})` });
}

module.exports = { layoutTagLines, measure, render };
