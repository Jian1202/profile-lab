const { circle, group, line, rect, text } = require('../../utils/svg');

function measure(_section, { layout }) {
  return { height: layout.blockHeights.mission };
}

function render(section, { theme, layout, offsetY, height }) {
  const { data } = section;
  const { colors, fonts } = theme;
  const { width, gutter } = layout.canvas;
  const positions = [60, 450];
  const lanes = data.tracks.map((mission, index) => {
    const x = positions[index];
    const accent = colors[mission.color];
    const items = mission.items.map((item, itemIndex) => group([
      circle({ cx: 0, cy: 0, r: 4, fill: accent }),
      text(item, { x: 16, y: 5, fill: colors.text, 'font-family': fonts.mono, 'font-size': 13 }),
    ], { transform: `translate(${x + 26 + itemIndex * 92} 154)` }));

    return group([
      rect({ x, y: 76, width: 350, height: 112, rx: 8, fill: colors.background, stroke: colors.border }),
      rect({ x: x + 18, y: 96, width: 64, height: 7, rx: 3.5, fill: accent }),
      text(mission.name, { x: x + 18, y: 130, fill: colors.primary, 'font-family': fonts.display, 'font-size': 19, 'font-weight': 700 }),
      items,
    ]);
  });

  return group([
    rect({ width, height, fill: colors.card }),
    line({ x1: gutter, y1: 0, x2: gutter, y2: height, stroke: colors.border }),
    line({ x1: width - gutter, y1: 0, x2: width - gutter, y2: height, stroke: colors.border }),
    text(data.title, { x: 60, y: 48, fill: colors.primary, 'font-family': fonts.display, 'font-size': 28, 'font-weight': 750 }),
    text(data.eyebrow, { x: 800, y: 46, fill: colors.text, opacity: 0.62, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
    lanes,
  ], { id: 'mission', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render };
