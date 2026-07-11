const { circle, group, line, path, rect, text } = require('../../utils/svg');
const { truncateText } = require('../../text');

function measure(_section, { layout }) {
  return { height: layout.blockHeights.footer };
}

function render(section, { theme, layout, offsetY, height }) {
  const { data } = section;
  const { colors, fonts } = theme;
  const { width, gutter, radius } = layout.canvas;
  const handle = truncateText(data.handle, { maxWidth: 82, fontSize: 14, fontWeight: 700, family: fonts.mono }).text;
  const slogan = truncateText(data.slogan, { maxWidth: 220, fontSize: 11, family: fonts.mono }).text;

  return group([
    path({
      d: `M0 0H${width}V${height - radius}Q${width} ${height} ${width - radius} ${height}H${radius}Q0 ${height} 0 ${height - radius}Z`,
      fill: colors.border,
    }),
    rect({ x: gutter, y: 0, width: width - gutter * 2, height: height - 28, fill: colors.card, stroke: colors.border }),
    text(handle, { x: 60, y: 40, fill: colors.primary, 'font-family': fonts.mono, 'font-size': 14, 'font-weight': 700 }),
    line({ x1: 154, y1: 36, x2: 560, y2: 36, stroke: colors.border, 'stroke-width': 2, 'stroke-linecap': 'round' }),
    circle({ cx: 590, cy: 36, r: 5, fill: colors.blue }),
    circle({ cx: 612, cy: 36, r: 5, fill: colors.green }),
    circle({ cx: 634, cy: 36, r: 5, fill: colors.gold }),
    text(slogan, { x: 800, y: 40, fill: colors.text, opacity: 0.75, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
  ], { id: 'footer', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render };
