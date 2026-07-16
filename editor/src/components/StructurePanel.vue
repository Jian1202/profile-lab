<script setup>
import { ChevronDown, ChevronUp, FileText, Palette, PanelsTopLeft } from '@lucide/vue';

const props = defineProps({
  config: { type: Object, required: true },
  manifest: { type: Object, required: true },
  selected: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
});

defineEmits(['move', 'select', 'toggle']);

function blockLabel(type) {
  return props.manifest.blocks.find((block) => block.type === type)?.label || type;
}

function isSelected(kind, index) {
  return props.selected.kind === kind
    && (kind !== 'section' || props.selected.index === index);
}
</script>

<template>
  <aside class="panel structure-panel" aria-label="页面结构">
    <div class="panel-heading">
      <div>
        <span class="panel-kicker">STRUCTURE</span>
        <h2>页面结构</h2>
      </div>
      <span class="panel-count">{{ config.sections.length }} 区块</span>
    </div>

    <nav class="structure-list">
      <button
        class="structure-static-item"
        :class="{ 'is-selected': isSelected('page') }"
        type="button"
        @click="$emit('select', { kind: 'page' })"
      >
        <FileText :size="17" />
        <span>页面信息</span>
      </button>
      <button
        class="structure-static-item"
        :class="{ 'is-selected': isSelected('theme') }"
        type="button"
        @click="$emit('select', { kind: 'theme' })"
      >
        <Palette :size="17" />
        <span>主题</span>
      </button>

      <div class="structure-separator">
        <PanelsTopLeft :size="14" />
        区块
      </div>

      <div
        v-for="(section, index) in config.sections"
        :key="section.id + index"
        class="section-row"
        :class="{
          'is-selected': isSelected('section', index),
          'is-disabled': !section.enabled,
        }"
        role="button"
        tabindex="0"
        @click="$emit('select', { kind: 'section', index })"
        @keydown.enter="$emit('select', { kind: 'section', index })"
      >
        <label class="mini-toggle" :title="section.enabled ? '关闭区块' : '启用区块'" @click.stop>
          <input
            type="checkbox"
            :checked="section.enabled"
            :disabled="disabled"
            :aria-label="`${section.enabled ? '关闭' : '启用'} ${blockLabel(section.type)}`"
            @change="$emit('toggle', index)"
          >
          <span></span>
        </label>
        <div class="section-copy">
          <strong>{{ blockLabel(section.type) }}</strong>
          <code>{{ section.id }}</code>
        </div>
        <div class="section-order-actions">
          <button
            class="icon-button"
            type="button"
            title="上移区块"
            :disabled="disabled || index === 0"
            @click.stop="$emit('move', index, -1)"
          >
            <ChevronUp :size="15" />
          </button>
          <button
            class="icon-button"
            type="button"
            title="下移区块"
            :disabled="disabled || index === config.sections.length - 1"
            @click.stop="$emit('move', index, 1)"
          >
            <ChevronDown :size="15" />
          </button>
        </div>
      </div>
    </nav>
  </aside>
</template>
