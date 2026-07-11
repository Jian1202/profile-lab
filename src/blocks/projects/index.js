const { group, line, rect, text } = require('../../utils/svg');
const { truncateText, wrapText } = require('../../text');

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
    const tags = truncateText(entry.tags.join(' · '), { maxWidth: 184, fontSize: 10, family: fonts.mono }).text;

    return group([
      rect({ x, y: 76, width: 220, height: 136, rx: 8, fill: colors.background, stroke: colors.border }),
      line({ x1: x + 18, y1: 96, x2: x + 202, y2: 96, stroke: accent, 'stroke-width': 4, 'stroke-linecap': 'round' }),
      text(name, { x: x + 18, y: 130, fill: colors.primary, 'font-family': fonts.mono, 'font-size': 14, 'font-weight': 700 }),
      descriptionLines,
      text(tags, { x: x + 18, y: 194, fill: colors.text, opacity: 0.6, 'font-family': fonts.mono, 'font-size': 10 }),
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

module.exports = { measure, render };
