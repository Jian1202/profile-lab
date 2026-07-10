const { group, line, rect, text } = require('../../utils/svg');

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

    return group([
      rect({ x, y: 76, width: 220, height: 136, rx: 8, fill: colors.background, stroke: colors.border }),
      line({ x1: x + 18, y1: 96, x2: x + 202, y2: 96, stroke: accent, 'stroke-width': 4, 'stroke-linecap': 'round' }),
      text(entry.name, { x: x + 18, y: 130, fill: colors.primary, 'font-family': fonts.mono, 'font-size': 14, 'font-weight': 700 }),
      text(entry.description, { x: x + 18, y: 166, fill: colors.text, 'font-family': fonts.display, 'font-size': 13 }),
      text(entry.tags.join(' · '), { x: x + 18, y: 194, fill: colors.text, opacity: 0.6, 'font-family': fonts.mono, 'font-size': 10 }),
    ]);
  });

  return group([
    rect({ width, height, fill: colors.background }),
    line({ x1: gutter, y1: 0, x2: gutter, y2: height, stroke: colors.border }),
    line({ x1: width - gutter, y1: 0, x2: width - gutter, y2: height, stroke: colors.border }),
    text(data.title, { x: 60, y: 44, fill: colors.primary, 'font-family': fonts.display, 'font-size': 28, 'font-weight': 750 }),
    text(data.eyebrow, { x: 800, y: 42, fill: colors.text, opacity: 0.62, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
    cards,
  ], { id: 'projects', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render };
