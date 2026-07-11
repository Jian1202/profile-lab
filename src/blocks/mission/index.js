const { circle, group, line, rect, text } = require('../../utils/svg');
const { estimateTextWidth, truncateText } = require('../../text');

const missionItemLayout = {
  startOffsetX: 26,
  startY: 154,
  availableWidth: 306,
  maxRows: 2,
  rowGap: 26,
  itemGap: 18,
  bulletToTextGap: 16,
  fontSize: 13,
};

function legacyMissionItems(items, { startX, fontFamily }) {
  return items.map((item, index) => {
    const x = startX + index * 92;
    const nextX = index < 2 ? startX + (index + 1) * 92 : startX + missionItemLayout.availableWidth;
    const fitted = truncateText(item, {
      maxWidth: nextX - (x + missionItemLayout.bulletToTextGap) - 10,
      fontSize: missionItemLayout.fontSize,
      family: fontFamily,
    });

    return { ...fitted, x, y: missionItemLayout.startY, row: 0 };
  });
}

function fallbackMissionGrid(items, options) {
  const columns = Math.ceil(items.length / options.maxRows);
  const slotWidth = options.availableWidth / columns;

  return items.map((item, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = options.startX + column * slotWidth;
    const fitted = truncateText(item, {
      maxWidth: slotWidth - options.bulletToTextGap - options.itemGap,
      fontSize: options.fontSize,
      family: options.fontFamily,
    });

    return { ...fitted, x, y: options.startY + row * options.rowGap, row };
  });
}

function layoutMissionItems(items, options) {
  const rightEdge = options.startX + options.availableWidth;
  const result = [];
  let row = 0;
  let cursorX = options.startX;

  for (const item of items) {
    let fitted = truncateText(item, {
      maxWidth: options.availableWidth - options.bulletToTextGap,
      fontSize: options.fontSize,
      family: options.fontFamily,
    });
    let itemWidth = options.bulletToTextGap + estimateTextWidth(fitted.text, {
      fontSize: options.fontSize,
      family: options.fontFamily,
    });

    if (cursorX > options.startX && cursorX + itemWidth > rightEdge) {
      row += 1;
      cursorX = options.startX;
    }

    if (row >= options.maxRows) {
      return fallbackMissionGrid(items, options);
    }

    result.push({ ...fitted, x: cursorX, y: options.startY + row * options.rowGap, row });
    cursorX += itemWidth + options.itemGap;
  }

  return result;
}

function resolveMissionItems(items, cardX, fontFamily) {
  const startX = cardX + missionItemLayout.startOffsetX;
  const legacy = items.length <= 3 ? legacyMissionItems(items, { startX, fontFamily }) : [];

  if (legacy.length && legacy.every((item) => !item.truncated)) return legacy;
  return layoutMissionItems(items, { ...missionItemLayout, startX, fontFamily });
}

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
    const items = resolveMissionItems(mission.items, x, fonts.mono).map((item) => group([
      circle({ cx: 0, cy: 0, r: 4, fill: accent }),
      text(item.text, { x: 16, y: 5, fill: colors.text, 'font-family': fonts.mono, 'font-size': 13 }),
    ], { transform: `translate(${item.x} ${item.y})` }));
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

module.exports = { layoutMissionItems, measure, render, resolveMissionItems };
