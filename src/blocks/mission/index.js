const { circle, group, line, rect, text } = require('../../utils/svg');
const { truncateText } = require('../../text');

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
    const compact = mission.items.length > 3;
    const items = mission.items.map((item, itemIndex) => {
      const column = compact ? itemIndex % 3 : itemIndex;
      const row = compact ? Math.floor(itemIndex / 3) : 0;
      const itemX = x + 26 + column * 92;
      const nextX = column < 2 ? x + 26 + (column + 1) * 92 : x + 332;
      const fitted = truncateText(item, {
        maxWidth: nextX - (itemX + 16) - 10,
        fontSize: 13,
        family: fonts.mono,
      }).text;

      return group([
      circle({ cx: 0, cy: 0, r: 4, fill: accent }),
        text(fitted, { x: 16, y: 5, fill: colors.text, 'font-family': fonts.mono, 'font-size': 13 }),
      ], { transform: `translate(${itemX} ${154 + row * 26})` });
    });
    const name = truncateText(mission.name, {
      maxWidth: 314,
      fontSize: 19,
      fontWeight: 700,
      family: fonts.display,
    }).text;

    return group([
      rect({ x, y: 76, width: 350, height: 112, rx: 8, fill: colors.background, stroke: colors.border }),
      rect({ x: x + 18, y: 96, width: 64, height: 7, rx: 3.5, fill: accent }),
      text(name, { x: x + 18, y: 130, fill: colors.primary, 'font-family': fonts.display, 'font-size': 19, 'font-weight': 700 }),
      items,
    ]);
  });

  return group([
    rect({ width, height, fill: colors.card }),
    line({ x1: gutter, y1: 0, x2: gutter, y2: height, stroke: colors.border }),
    line({ x1: width - gutter, y1: 0, x2: width - gutter, y2: height, stroke: colors.border }),
    text(truncateText(data.title, { maxWidth: 520, fontSize: 28, fontWeight: 750, family: fonts.display }).text, { x: 60, y: 48, fill: colors.primary, 'font-family': fonts.display, 'font-size': 28, 'font-weight': 750 }),
    text(truncateText(data.eyebrow, { maxWidth: 190, fontSize: 11, family: fonts.mono }).text, { x: 800, y: 46, fill: colors.text, opacity: 0.62, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
    lanes,
  ], { id: 'mission', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render };
