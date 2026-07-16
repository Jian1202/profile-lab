<script setup>
import { computed } from 'vue';
import { ChevronDown, ChevronUp, Plus, Trash2 } from '@lucide/vue';
import {
  addListItem,
  createListItem,
  errorsAtPath,
  moveListItem,
  removeListItem,
} from '../utils/editor-utils.mjs';

defineOptions({ name: 'ManifestField' });

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { default: undefined },
  path: { type: String, required: true },
  errors: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const inputId = computed(() => `field-${props.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`);
const ownErrors = computed(() => errorsAtPath(props.errors, props.path));
const listValue = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
const characterCount = computed(() => (
  typeof props.modelValue === 'string' ? Array.from(props.modelValue).length : 0
));
const maxLength = computed(() => props.field.constraints?.maxLength);
const overLimit = computed(() => maxLength.value !== undefined && characterCount.value > maxLength.value);
const minItems = computed(() => props.field.constraints?.minItems ?? 0);
const maxItems = computed(() => props.field.constraints?.maxItems ?? Number.POSITIVE_INFINITY);

function updateText(event) {
  emit('update:modelValue', event.target.value);
}

function updateNumber(event) {
  const source = event.target.value;
  emit('update:modelValue', source === '' ? undefined : Number(source));
}

function replaceList(next) {
  emit('update:modelValue', next);
}

function addItem() {
  replaceList(addListItem(listValue.value, createListItem(props.field)));
}

function removeItem(index) {
  replaceList(removeListItem(listValue.value, index));
}

function moveItem(index, direction) {
  replaceList(moveListItem(listValue.value, index, direction));
}

function updateStringItem(index, value) {
  const next = [...listValue.value];
  next[index] = value;
  replaceList(next);
}

function updateObjectField(index, key, value) {
  const next = listValue.value.map((item, itemIndex) => (
    itemIndex === index ? { ...item, [key]: value } : item
  ));
  replaceList(next);
}
</script>

<template>
  <div v-if="field.control === 'text' || field.control === 'textarea'" class="form-field">
    <div class="field-label-row">
      <label :for="inputId">{{ field.label }}</label>
      <span v-if="maxLength" class="field-counter" :class="{ 'is-over': overLimit }">
        {{ characterCount }} / {{ maxLength }}
      </span>
    </div>
    <textarea
      v-if="field.control === 'textarea'"
      :id="inputId"
      :value="modelValue"
      :disabled="disabled"
      :aria-invalid="ownErrors.length > 0"
      rows="3"
      @input="updateText"
    ></textarea>
    <input
      v-else
      :id="inputId"
      type="text"
      :value="modelValue"
      :disabled="disabled"
      :aria-invalid="ownErrors.length > 0"
      @input="updateText"
    >
    <p v-if="field.help" class="field-help">{{ field.help }}</p>
    <p v-for="error in ownErrors" :key="error.message" class="field-error">{{ error.message }}</p>
  </div>

  <div v-else-if="field.control === 'number'" class="form-field">
    <label :for="inputId">{{ field.label }}</label>
    <input
      :id="inputId"
      type="number"
      :value="modelValue"
      :min="field.constraints?.min"
      :max="field.constraints?.max"
      :step="field.constraints?.step"
      :disabled="disabled"
      :aria-invalid="ownErrors.length > 0"
      @input="updateNumber"
    >
    <p v-for="error in ownErrors" :key="error.message" class="field-error">{{ error.message }}</p>
  </div>

  <div v-else-if="field.control === 'toggle'" class="form-field toggle-field">
    <span>{{ field.label }}</span>
    <label class="switch-control">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        :aria-label="field.label"
        @change="emit('update:modelValue', $event.target.checked)"
      >
      <span></span>
    </label>
    <p v-for="error in ownErrors" :key="error.message" class="field-error">{{ error.message }}</p>
  </div>

  <div v-else-if="field.control === 'select'" class="form-field">
    <label :for="inputId">{{ field.label }}</label>
    <select
      :id="inputId"
      :value="modelValue"
      :disabled="disabled"
      :aria-invalid="ownErrors.length > 0"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option v-for="option in field.options || []" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <p v-for="error in ownErrors" :key="error.message" class="field-error">{{ error.message }}</p>
  </div>

  <div v-else-if="field.control === 'string-list'" class="form-field list-field">
    <div class="list-field-heading">
      <div>
        <label>{{ field.label }}</label>
        <span>{{ listValue.length }} / {{ maxItems }}</span>
      </div>
      <button
        type="button"
        class="icon-button"
        title="增加条目"
        :disabled="disabled || listValue.length >= maxItems"
        @click="addItem"
      >
        <Plus :size="15" />
      </button>
    </div>
    <div v-for="(item, index) in listValue" :key="index" class="string-list-row">
      <div class="string-list-input">
        <input
          type="text"
          :value="item"
          :disabled="disabled"
          :aria-label="`${field.label} ${index + 1}`"
          :aria-invalid="errorsAtPath(errors, `${path}[${index}]`).length > 0"
          @input="updateStringItem(index, $event.target.value)"
        >
        <span v-if="field.item?.constraints?.maxLength" class="inline-counter">
          {{ Array.from(item || '').length }} / {{ field.item.constraints.maxLength }}
        </span>
      </div>
      <div class="list-row-actions">
        <button type="button" class="icon-button" title="上移" :disabled="disabled || index === 0" @click="moveItem(index, -1)">
          <ChevronUp :size="14" />
        </button>
        <button type="button" class="icon-button" title="下移" :disabled="disabled || index === listValue.length - 1" @click="moveItem(index, 1)">
          <ChevronDown :size="14" />
        </button>
        <button type="button" class="icon-button danger-button" title="删除" :disabled="disabled || listValue.length <= minItems" @click="removeItem(index)">
          <Trash2 :size="14" />
        </button>
      </div>
      <p v-for="error in errorsAtPath(errors, `${path}[${index}]`)" :key="error.message" class="field-error list-item-error">
        {{ error.message }}
      </p>
    </div>
    <p v-for="error in ownErrors" :key="error.message" class="field-error">{{ error.message }}</p>
  </div>

  <div v-else-if="field.control === 'object-list'" class="form-field list-field object-list-field">
    <div class="list-field-heading">
      <div>
        <label>{{ field.label }}</label>
        <span>{{ listValue.length }} / {{ maxItems }}</span>
      </div>
      <button
        type="button"
        class="icon-button"
        title="增加项目"
        :disabled="disabled || listValue.length >= maxItems"
        @click="addItem"
      >
        <Plus :size="15" />
      </button>
    </div>
    <article v-for="(item, index) in listValue" :key="index" class="object-list-item">
      <header>
        <strong>{{ field.label }} {{ index + 1 }}</strong>
        <div class="list-row-actions">
          <button type="button" class="icon-button" title="上移" :disabled="disabled || index === 0" @click="moveItem(index, -1)">
            <ChevronUp :size="14" />
          </button>
          <button type="button" class="icon-button" title="下移" :disabled="disabled || index === listValue.length - 1" @click="moveItem(index, 1)">
            <ChevronDown :size="14" />
          </button>
          <button type="button" class="icon-button danger-button" title="删除" :disabled="disabled || listValue.length <= minItems" @click="removeItem(index)">
            <Trash2 :size="14" />
          </button>
        </div>
      </header>
      <ManifestField
        v-for="itemField in field.itemFields"
        :key="itemField.key"
        :field="itemField"
        :model-value="item[itemField.key]"
        :path="`${path}[${index}].${itemField.path}`"
        :errors="errors"
        :disabled="disabled"
        @update:model-value="updateObjectField(index, itemField.key, $event)"
      />
    </article>
    <p v-for="error in ownErrors" :key="error.message" class="field-error">{{ error.message }}</p>
  </div>
</template>
