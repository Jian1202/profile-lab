const limits = require('../config/limits');
const { accentTokens } = require('../config/options');

const CONTROL_TYPES = Object.freeze([
  'text',
  'textarea',
  'number',
  'toggle',
  'select',
  'string-list',
  'object-list',
]);

const BLOCK_ORDER = Object.freeze([
  'header',
  'mission',
  'timeline',
  'radar',
  'skills',
  'projects',
  'footer',
]);

const accentLabels = {
  blue: '蓝色',
  green: '绿色',
  gold: '金色',
};

const accentOptions = accentTokens.map((value) => ({
  value,
  label: accentLabels[value] || value,
}));

function textField(key, label, maxLength, options = {}) {
  const constraints = { minLength: 1 };
  if (maxLength !== undefined) {
    constraints.maxLength = maxLength;
  }

  return {
    key,
    path: key,
    label,
    control: options.control || 'text',
    required: true,
    constraints,
    ...(options.help ? { help: options.help } : {}),
  };
}

function selectField(key, label, options) {
  return {
    key,
    path: key,
    label,
    control: 'select',
    required: true,
    options,
  };
}

function numberField(key, label, min, max) {
  return {
    key,
    path: key,
    label,
    control: 'number',
    required: true,
    constraints: { min, max, step: 1 },
  };
}

function stringListField(key, label, maxItems, itemMaxLength) {
  return {
    key,
    path: key,
    label,
    control: 'string-list',
    required: true,
    constraints: { minItems: 1, maxItems },
    item: {
      control: 'text',
      constraints: { minLength: 1, maxLength: itemMaxLength },
    },
  };
}

function objectListField(key, label, constraints, itemFields) {
  return {
    key,
    path: key,
    label,
    control: 'object-list',
    required: true,
    constraints,
    itemFields,
  };
}

const labeledFields = () => [
  textField('title', '标题', limits.common.title),
  textField('eyebrow', '英文角标', limits.common.eyebrow),
];

const editorDefinitions = {
  header: {
    label: '页首',
    variants: {
      default: {
        label: '默认页首',
        fields: [
          textField('title', '标题', limits.header.title),
          textField('greeting', '问候语', limits.header.greeting),
          textField('subtitle', '方向摘要', limits.header.subtitle),
        ],
        rules: [],
      },
    },
  },
  mission: {
    label: '当前方向',
    variants: {
      cards: {
        label: '双卡片',
        fields: [
          ...labeledFields(),
          objectListField(
            'tracks',
            '方向卡片',
            { minItems: 1, maxItems: limits.mission.tracks },
            [
              textField('name', '方向名称', limits.mission.trackName),
              stringListField('items', '关键词', limits.mission.items, limits.mission.item),
              selectField('color', '强调色', accentOptions),
            ],
          ),
        ],
        rules: [],
      },
    },
  },
  timeline: {
    label: '成长路径',
    variants: {
      horizontal: {
        label: '水平时间线',
        fields: [
          ...labeledFields(),
          objectListField(
            'entries',
            '时间节点',
            {
              minItems: limits.timeline.entries.min,
              maxItems: limits.timeline.entries.max,
            },
            [
              textField('year', '时间', limits.timeline.year),
              textField('focus', '阶段内容', limits.timeline.focus),
              selectField('color', '强调色', accentOptions),
            ],
          ),
        ],
        rules: [],
      },
    },
  },
  radar: {
    label: '数据雷达',
    variants: {
      default: {
        label: '默认雷达',
        fields: [
          ...labeledFields(),
          objectListField(
            'stats',
            '统计数据',
            { minItems: 1, maxItems: limits.radar.stats },
            [
              textField('label', '名称', limits.radar.statLabel),
              numberField('value', '数值', 0, limits.radar.statValue),
              selectField('color', '强调色', accentOptions),
            ],
          ),
          objectListField(
            'languages',
            '语言分布',
            { minItems: 1, maxItems: limits.radar.languages },
            [
              textField('name', '语言名称', limits.radar.languageName),
              numberField('percent', '百分比', 0, 100),
            ],
          ),
        ],
        rules: [
          {
            id: 'language-percent-total',
            kind: 'sum',
            path: 'languages',
            field: 'percent',
            target: 100,
            tolerance: limits.radar.languageTotalTolerance,
            message: '语言百分比总和必须为 100',
          },
        ],
      },
    },
  },
  skills: {
    label: '技能树',
    variants: {
      tree: {
        label: '树形',
        fields: [
          ...labeledFields(),
          objectListField(
            'trees',
            '技能分组',
            { minItems: 1, maxItems: limits.skills.trees },
            [
              textField('name', '分组名称', limits.skills.treeName),
              stringListField('items', '技能条目', limits.skills.items, limits.skills.item),
              selectField('color', '强调色', accentOptions),
            ],
          ),
        ],
        rules: [],
      },
    },
  },
  projects: {
    label: '项目',
    variants: {
      drawer: {
        label: '项目抽屉',
        fields: [
          ...labeledFields(),
          objectListField(
            'entries',
            '项目列表',
            { minItems: 1, maxItems: limits.projects.entries },
            [
              textField('name', '项目名称', limits.projects.name),
              textField('description', '项目描述', limits.projects.description, { control: 'textarea' }),
              stringListField('tags', '标签', limits.projects.tags, limits.projects.tag),
              selectField('color', '强调色', accentOptions),
            ],
          ),
        ],
        rules: [],
      },
    },
  },
  footer: {
    label: '页尾',
    variants: {
      default: {
        label: '默认页尾',
        fields: [
          textField('handle', '账号标识', limits.footer.handle),
          textField('slogan', '收尾语', limits.footer.slogan),
        ],
        rules: [],
      },
    },
  },
};

const pageDefinition = {
  label: '页面信息',
  fields: [
    textField('title', '页面标题', limits.page.title),
    textField('subtitle', '页面副标题', limits.page.subtitle),
    textField('description', '页面描述', limits.page.description, { control: 'textarea' }),
  ],
};

const themePresetLabels = Object.freeze({
  'light-blue': '浅蓝',
});

function createThemeDefinition(presetValues) {
  return {
    label: '主题',
    fields: [
      selectField(
        'preset',
        '主题预设',
        presetValues.map((value) => ({
          value,
          label: themePresetLabels[value] || value,
        })),
      ),
    ],
  };
}

function createSectionDefinition(blocks) {
  return {
    label: '区块',
    commonFields: [
      textField('id', '区块 ID', undefined, { help: '区块在当前配置中的唯一标识' }),
      {
        key: 'enabled',
        path: 'enabled',
        label: '显示区块',
        control: 'toggle',
        required: true,
      },
      selectField(
        'type',
        '区块类型',
        blocks.map((block) => ({ value: block.type, label: block.label })),
      ),
      {
        key: 'variant',
        path: 'variant',
        label: '布局变体',
        control: 'select',
        required: true,
        dynamicOptions: 'block.variants',
      },
    ],
  };
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

deepFreeze(accentOptions);
deepFreeze(editorDefinitions);
deepFreeze(pageDefinition);

module.exports = {
  BLOCK_ORDER,
  CONTROL_TYPES,
  createSectionDefinition,
  createThemeDefinition,
  editorDefinitions,
  pageDefinition,
};
