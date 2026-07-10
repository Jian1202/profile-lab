const { circle, group, line, path, rect, text } = require('../../utils/svg');

function measure(_section, { layout }) {
  return { height: layout.blockHeights.radar };
}

function render(section, { theme, layout, offsetY, height }) {
  const { data } = section;
  const { colors, fonts } = theme;
  const { width, gutter } = layout.canvas;
  const positions = [60, 250, 440, 630];
  const readings = data.stats.map((metric, index) => {
    const x = positions[index];
    const accent = colors[metric.color];

    return group([
      line({ x1: x, y1: 84, x2: x + 142, y2: 84, stroke: colors.border, 'stroke-width': 3 }),
      circle({ cx: x + 5, cy: 84, r: 5, fill: accent }),
      text(metric.value, { x, y: 122, fill: colors.primary, 'font-family': fonts.mono, 'font-size': 26, 'font-weight': 700 }),
      text(metric.label, { x: x + 52, y: 120, fill: colors.text, 'font-family': fonts.display, 'font-size': 14 }),
    ]);
  });

  return group([
    rect({ width, height, fill: colors.background }),
    line({ x1: gutter, y1: 0, x2: gutter, y2: height, stroke: colors.border }),
    line({ x1: width - gutter, y1: 0, x2: width - gutter, y2: height, stroke: colors.border }),
    text(data.title, { x: 60, y: 48, fill: colors.primary, 'font-family': fonts.display, 'font-size': 28, 'font-weight': 750 }),
    text(data.eyebrow, { x: 800, y: 46, fill: colors.text, opacity: 0.62, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
    readings,
    group([
      circle({ r: 72, stroke: colors.border, 'stroke-width': 1.5 }),
      circle({ r: 48, stroke: colors.border, 'stroke-width': 1.5, 'stroke-dasharray': '4 7' }),
      circle({ r: 24, stroke: colors.border, 'stroke-width': 1.5 }),
      line({ x1: -180, y1: 0, x2: 180, y2: 0, stroke: colors.border }),
      line({ x1: 0, y1: -72, x2: 0, y2: 72, stroke: colors.border }),
      path({ d: 'M0 0L60 -38A71 71 0 0 1 71 5Z', fill: colors.blue, opacity: 0.16 }),
      line({ x1: 0, y1: 0, x2: 60, y2: -38, stroke: colors.blue, 'stroke-width': 2, 'stroke-linecap': 'round' }),
      circle({ cx: -36, cy: 22, r: 5, fill: colors.green }),
      circle({ cx: 25, cy: -30, r: 5, fill: colors.gold }),
      circle({ cx: 52, cy: 34, r: 4, fill: colors.blue }),
      circle({ r: 7, fill: colors.primary }),
      circle({ r: 3, fill: colors.card }),
    ], { transform: 'translate(430 212)' }),
  ], { id: 'radar', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render };
