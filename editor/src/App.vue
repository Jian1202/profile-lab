<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { FlaskConical, RefreshCw } from '@lucide/vue';
import { editorApi } from './api/editor-api';
import InspectorPanel from './components/InspectorPanel.vue';
import PreviewPanel from './components/PreviewPanel.vue';
import StructurePanel from './components/StructurePanel.vue';
import TopToolbar from './components/TopToolbar.vue';
import {
  configFingerprint,
  createLatestRequestGuard,
  deepClone,
  moveListItem,
  setAtPath,
  validateEditorConfig,
} from './utils/editor-utils.mjs';

const session = ref(null);
const manifest = ref(null);
const currentConfig = ref(null);
const baselineFingerprint = ref('');
const diskConfigHash = ref('');
const selected = ref({ kind: 'page' });
const initialError = ref('');
const loading = ref(true);
const suspendRender = ref(false);
const canRollback = ref(false);
const saveState = ref('idle');
const operationState = ref('idle');
const operationMessage = ref(null);
const renderState = ref('idle');
const serverErrors = ref([]);
const previewUrl = ref('');
const previewWidth = ref(860);
const previewHeight = ref(0);
const previewMode = ref('fit');
const requestGuard = createLatestRequestGuard();
let renderTimer;
let noticeTimer;

const localErrors = computed(() => (
  currentConfig.value && manifest.value
    ? validateEditorConfig(currentConfig.value, manifest.value)
    : []
));

const validationErrors = computed(() => {
  const seen = new Set();
  return [...localErrors.value, ...serverErrors.value].filter((error) => {
    const key = `${error.path || 'config'}:${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});

const dirty = computed(() => Boolean(currentConfig.value)
  && configFingerprint(currentConfig.value) !== baselineFingerprint.value);
const invalid = computed(() => validationErrors.value.length > 0);
const busy = computed(() => saveState.value === 'saving' || operationState.value !== 'idle');
const canSave = computed(() => dirty.value
  && !invalid.value
  && renderState.value === 'valid'
  && !busy.value);

function setPreview(svg, width, height) {
  const nextUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = nextUrl;
  previewWidth.value = width;
  previewHeight.value = height;
}

function errorRecord(error) {
  return { path: error.path || 'config', message: error.message || '请求失败' };
}

function showMessage(message, kind = 'success') {
  operationMessage.value = { message, kind };
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    operationMessage.value = null;
  }, kind === 'success' ? 3200 : 7000);
}

async function performRender(config = deepClone(currentConfig.value)) {
  if (localErrors.value.length) {
    renderState.value = 'invalid';
    serverErrors.value = [];
    return false;
  }

  const request = requestGuard.begin();
  renderState.value = 'rendering';
  try {
    const result = await editorApi.render(config);
    if (!request.isLatest()) return false;
    setPreview(result.svg, result.width, result.height);
    serverErrors.value = [];
    renderState.value = 'valid';
    return true;
  } catch (error) {
    if (!request.isLatest()) return false;
    serverErrors.value = [errorRecord(error)];
    renderState.value = 'invalid';
    return false;
  }
}

function scheduleRender() {
  if (suspendRender.value || !currentConfig.value || !manifest.value) return;
  window.clearTimeout(renderTimer);
  requestGuard.invalidate();
  serverErrors.value = [];
  if (localErrors.value.length) {
    renderState.value = 'invalid';
    return;
  }
  renderState.value = 'queued';
  const snapshot = deepClone(currentConfig.value);
  renderTimer = window.setTimeout(() => performRender(snapshot), 250);
}

watch(currentConfig, scheduleRender);

function applyDiskConfig(config, configHash) {
  suspendRender.value = true;
  currentConfig.value = deepClone(config);
  baselineFingerprint.value = configFingerprint(config);
  diskConfigHash.value = configHash;
  serverErrors.value = [];
  suspendRender.value = false;
}

async function initialize() {
  loading.value = true;
  initialError.value = '';
  try {
    const [sessionData, manifestData, configData] = await Promise.all([
      editorApi.session(),
      editorApi.manifest(),
      editorApi.config(),
    ]);
    session.value = sessionData;
    manifest.value = manifestData;
    canRollback.value = sessionData.canRollback;
    applyDiskConfig(configData.config, configData.configHash);
    loading.value = false;
    await performRender(deepClone(configData.config));
  } catch (error) {
    initialError.value = error.message;
    loading.value = false;
  }
}

function changeField({ path, value }) {
  currentConfig.value = setAtPath(currentConfig.value, path, value);
  saveState.value = 'idle';
}

function toggleSection(index) {
  changeField({
    path: `sections[${index}].enabled`,
    value: !currentConfig.value.sections[index].enabled,
  });
}

function moveSection(index, direction) {
  const target = index + direction;
  const next = deepClone(currentConfig.value);
  next.sections = moveListItem(next.sections, index, direction);
  currentConfig.value = next;

  if (selected.value.kind === 'section') {
    if (selected.value.index === index) {
      selected.value = { kind: 'section', index: target };
    } else if (selected.value.index === target) {
      selected.value = { kind: 'section', index };
    }
  }
}

async function save() {
  if (!canSave.value) return;
  const snapshot = deepClone(currentConfig.value);
  const requestFingerprint = configFingerprint(snapshot);
  saveState.value = 'saving';
  operationMessage.value = null;

  try {
    const result = await editorApi.save(snapshot);
    baselineFingerprint.value = configFingerprint(result.config);
    diskConfigHash.value = result.configHash;
    canRollback.value = result.canRollback;
    if (configFingerprint(currentConfig.value) === requestFingerprint) {
      suspendRender.value = true;
      currentConfig.value = deepClone(result.config);
      suspendRender.value = false;
    }
    saveState.value = 'saved';
    showMessage('YAML 与 SVG 已一起保存。');
  } catch (error) {
    saveState.value = 'error';
    showMessage(error.message, 'error');
  }
}

async function reloadFromDisk() {
  if (dirty.value && !window.confirm('放弃当前未保存修改并从磁盘重新加载？')) {
    return;
  }

  operationState.value = 'reloading';
  requestGuard.invalidate();
  window.clearTimeout(renderTimer);
  try {
    const [configData, sessionData] = await Promise.all([editorApi.reload(), editorApi.session()]);
    applyDiskConfig(configData.config, configData.configHash);
    canRollback.value = sessionData.canRollback;
    selected.value = selected.value.kind === 'section'
      ? { kind: 'section', index: Math.min(selected.value.index, configData.config.sections.length - 1) }
      : selected.value;
    await performRender(deepClone(configData.config));
    saveState.value = 'idle';
    showMessage('已从磁盘重新加载。');
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    operationState.value = 'idle';
  }
}

async function rollback() {
  if (!canRollback.value || !window.confirm('恢复最近一次保存前的 YAML 和 SVG？')) {
    return;
  }

  operationState.value = 'rollback';
  requestGuard.invalidate();
  window.clearTimeout(renderTimer);
  try {
    const result = await editorApi.rollback();
    applyDiskConfig(result.config, result.configHash);
    canRollback.value = result.canRollback;
    setPreview(result.svg, result.width, result.height);
    renderState.value = 'valid';
    saveState.value = 'idle';
    showMessage('已恢复最近一次保存前的内容。');
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    operationState.value = 'idle';
  }
}

onMounted(initialize);
onBeforeUnmount(() => {
  window.clearTimeout(renderTimer);
  window.clearTimeout(noticeTimer);
  requestGuard.invalidate();
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>

<template>
  <div v-if="loading || initialError" class="startup-screen">
    <div class="startup-mark"><FlaskConical :size="28" /></div>
    <template v-if="initialError">
      <h1>编辑器未能启动</h1>
      <p>{{ initialError }}</p>
      <button class="button button-primary" type="button" @click="initialize">
        <RefreshCw :size="16" />
        重试
      </button>
    </template>
    <template v-else>
      <h1>Profile Lab</h1>
      <p>正在读取本地配置</p>
      <span class="loading-line" aria-hidden="true"></span>
    </template>
  </div>

  <div v-else class="app-shell">
    <TopToolbar
      :session="session"
      :dirty="dirty"
      :invalid="invalid"
      :save-state="saveState"
      :can-save="canSave"
      :can-rollback="canRollback"
      :busy="busy"
      @save="save"
      @reload="reloadFromDisk"
      @rollback="rollback"
    />

    <div v-if="operationMessage" class="notice-strip" :class="`is-${operationMessage.kind}`" role="status">
      {{ operationMessage.message }}
    </div>
    <div v-else-if="validationErrors.length" class="notice-strip is-error" role="alert">
      {{ validationErrors[0].message }}
      <span v-if="validationErrors.length > 1">另有 {{ validationErrors.length - 1 }} 项需要处理</span>
    </div>

    <div class="editor-grid">
      <StructurePanel
        :config="currentConfig"
        :manifest="manifest"
        :selected="selected"
        :disabled="busy"
        @select="selected = $event"
        @toggle="toggleSection"
        @move="moveSection"
      />
      <PreviewPanel
        v-model:mode="previewMode"
        :preview-url="previewUrl"
        :width="previewWidth"
        :height="previewHeight"
        :state="renderState"
        :invalid="invalid"
      />
      <InspectorPanel
        :config="currentConfig"
        :manifest="manifest"
        :selected="selected"
        :errors="validationErrors"
        :disabled="busy"
        @change="changeField"
      />
    </div>
  </div>
</template>
