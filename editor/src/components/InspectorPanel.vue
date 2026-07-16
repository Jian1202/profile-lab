<script setup>
import { computed } from 'vue';
import ManifestField from './ManifestField.vue';
import { errorsAtPath, getAtPath } from '../utils/editor-utils.mjs';

const props = defineProps({
  config: { type: Object, required: true },
  manifest: { type: Object, required: true },
  selected: { type: Object, required: true },
  errors: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['change']);

const section = computed(() => (
  props.selected.kind === 'section' ? props.config.sections[props.selected.index] : null
));
const block = computed(() => (
  section.value
    ? props.manifest.blocks.find((entry) => entry.type === section.value.type)
    : null
));
const variant = computed(() => (
  block.value?.variants.find((entry) => entry.value === section.value?.variant)
));
const commonFields = computed(() => props.manifest.section.commonFields
  .filter((field) => !['type', 'variant'].includes(field.key)));

const title = computed(() => {
  if (props.selected.kind === 'page') return props.manifest.page.label;
  if (props.selected.kind === 'theme') return props.manifest.theme.label;
  return block.value?.label || section.value?.type || '区块';
});

const subtitle = computed(() => {
  if (props.selected.kind === 'page') return 'README 与 SVG 元信息';
  if (props.selected.kind === 'theme') return '当前视觉预设';
  return `${section.value?.id || ''} · ${variant.value?.label || section.value?.variant || ''}`;
});

const targetErrorCount = computed(() => {
  const prefix = props.selected.kind === 'section'
    ? `sections[${props.selected.index}]`
    : props.selected.kind;
  return errorsAtPath(props.errors, prefix, { includeChildren: true }).length;
});

function fieldPath(scope, field) {
  if (scope === 'page' || scope === 'theme') {
    return `${scope}.${field.path}`;
  }
  const base = `sections[${props.selected.index}]`;
  return scope === 'section' ? `${base}.${field.path}` : `${base}.data.${field.path}`;
}

function fieldValue(scope, field) {
  return getAtPath(props.config, fieldPath(scope, field));
}

function update(scope, field, value) {
  emit('change', { path: fieldPath(scope, field), value });
}
</script>

<template>
  <aside class="panel inspector-panel" aria-label="属性编辑器">
    <div class="panel-heading inspector-heading">
      <div>
        <span class="panel-kicker">INSPECTOR</span>
        <h2>{{ title }}</h2>
        <p>{{ subtitle }}</p>
      </div>
      <span v-if="targetErrorCount" class="error-count">{{ targetErrorCount }} 错误</span>
    </div>

    <div class="inspector-scroll">
      <template v-if="selected.kind === 'page'">
        <ManifestField
          v-for="field in manifest.page.fields"
          :key="field.key"
          :field="field"
          :model-value="fieldValue('page', field)"
          :path="fieldPath('page', field)"
          :errors="errors"
          :disabled="disabled"
          @update:model-value="update('page', field, $event)"
        />
      </template>

      <template v-else-if="selected.kind === 'theme'">
        <ManifestField
          v-for="field in manifest.theme.fields"
          :key="field.key"
          :field="field"
          :model-value="fieldValue('theme', field)"
          :path="fieldPath('theme', field)"
          :errors="errors"
          :disabled="disabled"
          @update:model-value="update('theme', field, $event)"
        />
      </template>

      <template v-else-if="section">
        <div class="readonly-grid">
          <div>
            <span>区块类型</span>
            <strong>{{ block?.label || section.type }}</strong>
          </div>
          <div>
            <span>布局变体</span>
            <strong>{{ variant?.label || section.variant }}</strong>
          </div>
        </div>

        <ManifestField
          v-for="field in commonFields"
          :key="field.key"
          :field="field"
          :model-value="fieldValue('section', field)"
          :path="fieldPath('section', field)"
          :errors="errors"
          :disabled="disabled"
          @update:model-value="update('section', field, $event)"
        />

        <div class="inspector-divider"><span>区块内容</span></div>

        <ManifestField
          v-for="field in variant?.fields || []"
          :key="field.key"
          :field="field"
          :model-value="fieldValue('data', field)"
          :path="fieldPath('data', field)"
          :errors="errors"
          :disabled="disabled"
          @update:model-value="update('data', field, $event)"
        />
      </template>

      <div class="yaml-warning">
        保存会按固定顺序重新格式化 YAML，原有注释可能丢失。
      </div>
    </div>
  </aside>
</template>
