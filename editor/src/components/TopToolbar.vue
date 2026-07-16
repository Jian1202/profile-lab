<script setup>
import { computed } from 'vue';
import { FlaskConical, RefreshCw, RotateCcw, Save } from '@lucide/vue';

const props = defineProps({
  session: { type: Object, default: null },
  dirty: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  saveState: { type: String, default: 'idle' },
  canSave: { type: Boolean, default: false },
  canRollback: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});

defineEmits(['save', 'reload', 'rollback']);

const status = computed(() => {
  if (props.saveState === 'saving') {
    return { label: '正在保存', kind: 'working' };
  }
  if (props.invalid) {
    return { label: '配置错误', kind: 'error' };
  }
  if (props.dirty) {
    return { label: '有未保存修改', kind: 'dirty' };
  }
  return { label: '已保存', kind: 'saved' };
});
</script>

<template>
  <header class="top-toolbar">
    <div class="brand-lockup">
      <span class="brand-mark" aria-hidden="true"><FlaskConical :size="20" /></span>
      <div class="brand-copy">
        <strong>Profile Lab</strong>
        <span v-if="session">{{ session.generatorVersion }}</span>
      </div>
    </div>

    <div v-if="session" class="file-context" title="当前配置与输出文件">
      <span>{{ session.configFileName }}</span>
      <span class="file-divider">→</span>
      <span>{{ session.outputFileName }}</span>
    </div>

    <div class="toolbar-actions">
      <div class="save-status" :class="`is-${status.kind}`" role="status">
        <span class="status-dot" aria-hidden="true"></span>
        {{ status.label }}
      </div>
      <button
        class="button button-secondary"
        type="button"
        :disabled="busy"
        title="重新读取磁盘配置"
        @click="$emit('reload')"
      >
        <RefreshCw :size="16" />
        重新加载
      </button>
      <button
        class="button button-secondary"
        type="button"
        :disabled="busy || !canRollback"
        title="恢复最近一次保存前的 YAML 和 SVG"
        @click="$emit('rollback')"
      >
        <RotateCcw :size="16" />
        回滚
      </button>
      <button
        class="button button-primary"
        type="button"
        :disabled="!canSave"
        @click="$emit('save')"
      >
        <Save :size="16" />
        保存
      </button>
    </div>
  </header>
</template>
