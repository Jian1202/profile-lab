const { accent, fail, keys, list, number, string } = require('./assert');
const limits = require('./limits');

function labeledSection(data, path, entryKey) {
  keys(data, path, ['eyebrow', entryKey, 'title']);
  string(data.title, `${path}.title`, { maxLength: limits.common.title });
  string(data.eyebrow, `${path}.eyebrow`, { maxLength: limits.common.eyebrow });
  list(data[entryKey], `${path}.${entryKey}`);
}

function header(data, path) {
  keys(data, path, ['greeting', 'subtitle', 'title']);
  string(data.title, `${path}.title`, { maxLength: limits.header.title });
  string(data.greeting, `${path}.greeting`, { maxLength: limits.header.greeting });
  string(data.subtitle, `${path}.subtitle`, { maxLength: limits.header.subtitle });
}

function mission(data, path) {
  labeledSection(data, path, 'tracks');
  list(data.tracks, `${path}.tracks`, { maxItems: limits.mission.tracks });
  data.tracks.forEach((track, index) => {
    const itemPath = `${path}.tracks[${index}]`;
    keys(track, itemPath, ['color', 'items', 'name']);
    string(track.name, `${itemPath}.name`, { maxLength: limits.mission.trackName });
    accent(track.color, `${itemPath}.color`);
    list(track.items, `${itemPath}.items`, { maxItems: limits.mission.items });
    track.items.forEach((item, itemIndex) => string(
      item,
      `${itemPath}.items[${itemIndex}]`,
      { maxLength: limits.mission.item },
    ));
  });
}

function timeline(data, path) {
  labeledSection(data, path, 'entries');
  list(data.entries, `${path}.entries`, {
    minItems: limits.timeline.entries.min,
    maxItems: limits.timeline.entries.max,
  });
  data.entries.forEach((entry, index) => {
    const itemPath = `${path}.entries[${index}]`;
    keys(entry, itemPath, ['color', 'focus', 'year']);
    string(entry.year, `${itemPath}.year`, { maxLength: limits.timeline.year });
    string(entry.focus, `${itemPath}.focus`, { maxLength: limits.timeline.focus });
    accent(entry.color, `${itemPath}.color`);
  });
}

function radar(data, path) {
  keys(data, path, ['eyebrow', 'languages', 'stats', 'title']);
  string(data.title, `${path}.title`, { maxLength: limits.common.title });
  string(data.eyebrow, `${path}.eyebrow`, { maxLength: limits.common.eyebrow });
  list(data.stats, `${path}.stats`, { maxItems: limits.radar.stats });
  list(data.languages, `${path}.languages`, { maxItems: limits.radar.languages });
  data.stats.forEach((stat, index) => {
    const itemPath = `${path}.stats[${index}]`;
    keys(stat, itemPath, ['color', 'label', 'value']);
    string(stat.label, `${itemPath}.label`, { maxLength: limits.radar.statLabel });
    number(stat.value, `${itemPath}.value`, { max: limits.radar.statValue });
    accent(stat.color, `${itemPath}.color`);
  });
  data.languages.forEach((language, index) => {
    const itemPath = `${path}.languages[${index}]`;
    keys(language, itemPath, ['name', 'percent']);
    string(language.name, `${itemPath}.name`, { maxLength: limits.radar.languageName });
    number(language.percent, `${itemPath}.percent`, { max: 100 });
  });

  const total = data.languages.reduce((sum, language) => sum + language.percent, 0);
  if (Math.abs(total - 100) > limits.radar.languageTotalTolerance) {
    const received = Number(total.toFixed(4));
    fail(`${path}.languages`, `percentages must sum to 100, received ${received}.`);
  }
}

function skills(data, path) {
  labeledSection(data, path, 'trees');
  list(data.trees, `${path}.trees`, { maxItems: limits.skills.trees });
  data.trees.forEach((tree, index) => {
    const itemPath = `${path}.trees[${index}]`;
    keys(tree, itemPath, ['color', 'items', 'name']);
    string(tree.name, `${itemPath}.name`, { maxLength: limits.skills.treeName });
    accent(tree.color, `${itemPath}.color`);
    list(tree.items, `${itemPath}.items`, { maxItems: limits.skills.items });
    tree.items.forEach((item, itemIndex) => string(
      item,
      `${itemPath}.items[${itemIndex}]`,
      { maxLength: limits.skills.item },
    ));
  });
}

function projects(data, path) {
  labeledSection(data, path, 'entries');
  list(data.entries, `${path}.entries`, { maxItems: limits.projects.entries });
  data.entries.forEach((entry, index) => {
    const itemPath = `${path}.entries[${index}]`;
    keys(entry, itemPath, ['color', 'description', 'name', 'tags']);
    string(entry.name, `${itemPath}.name`, { maxLength: limits.projects.name });
    string(entry.description, `${itemPath}.description`, { maxLength: limits.projects.description });
    accent(entry.color, `${itemPath}.color`);
    list(entry.tags, `${itemPath}.tags`, { maxItems: limits.projects.tags });
    entry.tags.forEach((tag, tagIndex) => string(
      tag,
      `${itemPath}.tags[${tagIndex}]`,
      { maxLength: limits.projects.tag },
    ));
  });
}

function footer(data, path) {
  keys(data, path, ['handle', 'slogan']);
  string(data.handle, `${path}.handle`, { maxLength: limits.footer.handle });
  string(data.slogan, `${path}.slogan`, { maxLength: limits.footer.slogan });
}

module.exports = { footer, header, mission, projects, radar, skills, timeline };
