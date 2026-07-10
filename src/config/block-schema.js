const { accent, keys, list, number, string } = require('./assert');

function labeledSection(data, path, entryKey) {
  keys(data, path, ['eyebrow', entryKey, 'title']);
  string(data.title, `${path}.title`);
  string(data.eyebrow, `${path}.eyebrow`);
  list(data[entryKey], `${path}.${entryKey}`);
}

function header(data, path) {
  keys(data, path, ['greeting', 'subtitle', 'title']);
  Object.entries(data).forEach(([key, value]) => string(value, `${path}.${key}`));
}

function mission(data, path) {
  labeledSection(data, path, 'tracks');
  data.tracks.forEach((track, index) => {
    const itemPath = `${path}.tracks[${index}]`;
    keys(track, itemPath, ['color', 'items', 'name']);
    string(track.name, `${itemPath}.name`);
    accent(track.color, `${itemPath}.color`);
    list(track.items, `${itemPath}.items`);
    track.items.forEach((item, itemIndex) => string(item, `${itemPath}.items[${itemIndex}]`));
  });
}

function timeline(data, path) {
  labeledSection(data, path, 'entries');
  data.entries.forEach((entry, index) => {
    const itemPath = `${path}.entries[${index}]`;
    keys(entry, itemPath, ['color', 'focus', 'year']);
    string(entry.year, `${itemPath}.year`);
    string(entry.focus, `${itemPath}.focus`);
    accent(entry.color, `${itemPath}.color`);
  });
}

function radar(data, path) {
  keys(data, path, ['eyebrow', 'languages', 'stats', 'title']);
  string(data.title, `${path}.title`);
  string(data.eyebrow, `${path}.eyebrow`);
  list(data.stats, `${path}.stats`);
  list(data.languages, `${path}.languages`);
  data.stats.forEach((stat, index) => {
    const itemPath = `${path}.stats[${index}]`;
    keys(stat, itemPath, ['color', 'label', 'value']);
    string(stat.label, `${itemPath}.label`);
    number(stat.value, `${itemPath}.value`);
    accent(stat.color, `${itemPath}.color`);
  });
  data.languages.forEach((language, index) => {
    const itemPath = `${path}.languages[${index}]`;
    keys(language, itemPath, ['name', 'percent']);
    string(language.name, `${itemPath}.name`);
    number(language.percent, `${itemPath}.percent`, { max: 100 });
  });
}

function skills(data, path) {
  labeledSection(data, path, 'trees');
  data.trees.forEach((tree, index) => {
    const itemPath = `${path}.trees[${index}]`;
    keys(tree, itemPath, ['color', 'items', 'name']);
    string(tree.name, `${itemPath}.name`);
    accent(tree.color, `${itemPath}.color`);
    list(tree.items, `${itemPath}.items`);
    tree.items.forEach((item, itemIndex) => string(item, `${itemPath}.items[${itemIndex}]`));
  });
}

function projects(data, path) {
  labeledSection(data, path, 'entries');
  data.entries.forEach((entry, index) => {
    const itemPath = `${path}.entries[${index}]`;
    keys(entry, itemPath, ['color', 'description', 'name', 'tags']);
    string(entry.name, `${itemPath}.name`);
    string(entry.description, `${itemPath}.description`);
    accent(entry.color, `${itemPath}.color`);
    list(entry.tags, `${itemPath}.tags`);
    entry.tags.forEach((tag, tagIndex) => string(tag, `${itemPath}.tags[${tagIndex}]`));
  });
}

function footer(data, path) {
  keys(data, path, ['handle', 'slogan']);
  Object.entries(data).forEach(([key, value]) => string(value, `${path}.${key}`));
}

module.exports = { footer, header, mission, projects, radar, skills, timeline };
