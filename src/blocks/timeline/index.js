const { circle, group, line, rect, text } = require('../../utils/svg');

function measure(_section, { layout }) {
  const extraRow = _section.data.entries.length > 3 ? 30 : 0;
  return { height: layout.blockHeights.timeline + extraRow };
}

function render(section, { theme, layout, offsetY, height }) {
  const { data } = section;
  const { colors, fonts } = theme;
  const { width, gutter } = layout.canvas;
  const count = data.entries.length;
  const positions = count === 1
    ? [430]
    : data.entries.map((_, index) => 150 + (560 * index) / (count - 1));
  const stops = data.entries.map((entry, index) => {
    const x = positions[index];
    const accent = colors[entry.color];
    const focusY = count > 3 ? 164 + (index % 2) * 28 : 164;
    const focusSize = count > 3 ? 14 : 16;

    return group([
      rect({ x: x - 26, y: 88, width: 52, height: 22, rx: 11, fill: colors.background, stroke: colors.border }),
      text(entry.year, { x, y: 103, fill: colors.text, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'middle' }),
      circle({ cx: x, cy: 132, r: 9, fill: accent }),
      circle({ cx: x, cy: 132, r: 3, fill: colors.card }),
      text(entry.focus, { x, y: focusY, fill: colors.primary, 'font-family': fonts.display, 'font-size': focusSize, 'font-weight': 700, 'text-anchor': 'middle' }),
    ]);
  });

  return group([
    rect({ width, height, fill: colors.background }),
    line({ x1: gutter, y1: 0, x2: gutter, y2: height, stroke: colors.border }),
    line({ x1: width - gutter, y1: 0, x2: width - gutter, y2: height, stroke: colors.border }),
    text(data.title, { x: 60, y: 46, fill: colors.primary, 'font-family': fonts.display, 'font-size': 28, 'font-weight': 750 }),
    text(data.eyebrow, { x: 800, y: 44, fill: colors.text, opacity: 0.62, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
    line({ x1: positions[0], y1: 132, x2: positions[positions.length - 1], y2: 132, stroke: colors.border, 'stroke-width': 3, 'stroke-linecap': 'round' }),
    stops,
  ], { id: 'timeline', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render };
