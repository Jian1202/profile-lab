const { circle, group, line, path, rect, text } = require('../../utils/svg');
const { truncateText } = require('../../text');

function measure(_section, { layout }) {
  return { height: layout.blockHeights.header };
}

function render(section, { theme, layout, offsetY, height }) {
  const { data } = section;
  const { colors, fonts } = theme;
  const { width, gutter, radius } = layout.canvas;
  const display = { 'font-family': fonts.display };
  const mono = { 'font-family': fonts.mono };
  const title = truncateText(data.title, { maxWidth: 510, fontSize: 50, fontWeight: 750, family: fonts.display }).text;
  const greeting = truncateText(data.greeting, { maxWidth: 510, fontSize: 17, fontWeight: 500, family: fonts.display }).text;
  const subtitle = truncateText(data.subtitle, { maxWidth: 510, fontSize: 13, family: fonts.mono }).text;

  return group([
    path({
      d: `M${radius} 0H${width - radius}Q${width} 0 ${width} ${radius}V${height}H0V${radius}Q0 0 ${radius} 0Z`,
      fill: colors.border,
    }),
    rect({ x: gutter, y: 30, width: width - gutter * 2, height: height - 30, fill: colors.card, stroke: colors.border }),
    circle({ cx: 64, cy: 58, r: 5, fill: colors.gold }),
    circle({ cx: 86, cy: 58, r: 5, fill: colors.green }),
    circle({ cx: 108, cy: 58, r: 5, fill: colors.blue }),
    line({ x1: 48, y1: 84, x2: 812, y2: 84, stroke: colors.border }),
    text(title, { x: 60, y: 130, fill: colors.primary, 'font-size': 50, 'font-weight': 750, ...display }),
    text(greeting, { x: 60, y: 162, fill: colors.text, 'font-size': 17, 'font-weight': 500, ...display }),
    text(subtitle, { x: 60, y: 198, fill: colors.text, opacity: 0.72, 'font-size': 13, ...mono }),
    group([
      rect({ x: 0, y: 0, width: 184, height: 48, fill: colors.background, stroke: colors.border }),
      rect({ x: 18, y: 16, width: 44, height: 8, rx: 4, fill: colors.blue }),
      rect({ x: 72, y: 16, width: 28, height: 8, rx: 4, fill: colors.gold }),
      rect({ x: 110, y: 16, width: 54, height: 8, rx: 4, fill: colors.green }),
      line({ x1: 18, y1: 34, x2: 96, y2: 34, stroke: colors.border, 'stroke-width': 8, 'stroke-linecap': 'round' }),
      line({ x1: 106, y1: 34, x2: 164, y2: 34, stroke: colors.border, 'stroke-width': 8, 'stroke-linecap': 'round' }),
    ], { transform: 'translate(600 106)' }),
  ], { id: 'header', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render };
