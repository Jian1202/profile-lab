<script setup>
import { computed } from 'vue';
import { Expand, ScanLine } from '@lucide/vue';

const props = defineProps({
  previewUrl: { type: String, default: '' },
  width: { type: Number, default: 860 },
  height: { type: Number, default: 0 },
  state: { type: String, default: 'idle' },
  invalid: { type: Boolean, default: false },
  mode: { type: String, default: 'fit' },
});

defineEmits(['update:mode']);

const imageStyle = computed(() => (props.mode === 'actual'
  ? { width: `${props.width}px`, maxWidth: 'none' }
  : { width: '100%', maxWidth: `${props.width}px` }));

const stateLabel = computed(() => {
  if (props.state === 'rendering' || props.state === 'queued') {
    return '正在生成预览';
  }
  if (props.state === 'invalid') {
    return '保留上一次有效预览';
  }
  return props.height ? `${props.width} × ${props.height}` : '等待预览';
});
</script>

<template>
  <main class="preview-panel">
    <div class="preview-toolbar">
      <div class="preview-heading">
        <span class="panel-kicker">LIVE CANVAS</span>
        <strong>{{ stateLabel }}</strong>
      </div>
      <div class="segmented-control" aria-label="预览缩放">
        <button
          type="button"
          :class="{ 'is-active': mode === 'fit' }"
          title="适应可用宽度"
          @click="$emit('update:mode', 'fit')"
        >
          <Expand :size="15" />
          适应
        </button>
        <button
          type="button"
          :class="{ 'is-active': mode === 'actual' }"
          title="按 SVG 原始尺寸显示"
          @click="$emit('update:mode', 'actual')"
        >
          <ScanLine :size="15" />
          100%
        </button>
      </div>
    </div>

    <div v-if="invalid && previewUrl" class="preview-warning" role="status">
      当前修改存在校验错误，预览保持上一次有效结果。
    </div>

    <div class="canvas-scroll">
      <div v-if="previewUrl" class="preview-sheet" :class="`mode-${mode}`">
        <span class="registration-mark mark-top-left" aria-hidden="true"></span>
        <span class="registration-mark mark-top-right" aria-hidden="true"></span>
        <span class="registration-mark mark-bottom-left" aria-hidden="true"></span>
        <span class="registration-mark mark-bottom-right" aria-hidden="true"></span>
        <img
          :src="previewUrl"
          :style="imageStyle"
          :width="width"
          :height="height || undefined"
          alt="Profile SVG 实时预览"
        >
      </div>
      <div v-else class="preview-empty">
        <div class="preview-empty-mark"><ScanLine :size="28" /></div>
        <strong>正在准备画布</strong>
      </div>
    </div>
  </main>
</template>
