export function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item)]));
  }
  return value;
}

export function parsePath(pathValue) {
  const tokens = [];
  String(pathValue).replace(/([^.[\]]+)|\[(\d+)\]/g, (_, key, index) => {
    tokens.push(index === undefined ? key : Number(index));
    return '';
  });
  return tokens;
}

export function getAtPath(source, pathValue) {
  return parsePath(pathValue).reduce((value, token) => value?.[token], source);
}

export function setAtPath(source, pathValue, nextValue) {
  const tokens = parsePath(pathValue);
  const clone = deepClone(source);
  let current = clone;

  tokens.forEach((token, index) => {
    if (index === tokens.length - 1) {
      current[token] = nextValue;
      return;
    }
    current = current[token];
  });
  return clone;
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function configFingerprint(config) {
  return stableStringify(config);
}

export function addListItem(list, item) {
  return [...list, deepClone(item)];
}

export function removeListItem(list, index) {
  return list.filter((_, itemIndex) => itemIndex !== index);
}

export function moveListItem(list, index, direction) {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return [...list];
  }
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function defaultValueForField(field) {
  if (field.control === 'number') {
    return field.constraints?.min ?? 0;
  }
  if (field.control === 'toggle') {
    return true;
  }
  if (field.control === 'select') {
    return field.options?.[0]?.value ?? '';
  }
  if (field.control === 'string-list') {
    return ['新条目'];
  }
  if (field.control === 'object-list') {
    return [createListItem(field)];
  }
  return '新内容';
}

export function createListItem(field) {
  if (field.control === 'string-list') {
    return '新条目';
  }
  if (field.control === 'object-list') {
    return Object.fromEntries(field.itemFields.map((itemField) => [
      itemField.key,
      defaultValueForField(itemField),
    ]));
  }
  return defaultValueForField(field);
}

function characterLength(value) {
  return typeof value === 'string' ? Array.from(value).length : 0;
}

function addError(errors, path, message) {
  errors.push({ path, message });
}

export function validateFieldValue(field, value, path, errors = []) {
  const constraints = field.constraints || {};

  if (field.control === 'text' || field.control === 'textarea') {
    const length = characterLength(value);
    if (typeof value !== 'string' || (field.required && !value.trim())) {
      addError(errors, path, `${field.label}不能为空`);
    } else if (constraints.minLength !== undefined && length < constraints.minLength) {
      addError(errors, path, `${field.label}至少需要 ${constraints.minLength} 个字符`);
    } else if (constraints.maxLength !== undefined && length > constraints.maxLength) {
      addError(errors, path, `${field.label}最多允许 ${constraints.maxLength} 个字符`);
    }
    return errors;
  }

  if (field.control === 'number') {
    if (!Number.isFinite(value)) {
      addError(errors, path, `${field.label}必须是数字`);
    } else if (constraints.min !== undefined && value < constraints.min) {
      addError(errors, path, `${field.label}不能小于 ${constraints.min}`);
    } else if (constraints.max !== undefined && value > constraints.max) {
      addError(errors, path, `${field.label}不能大于 ${constraints.max}`);
    }
    return errors;
  }

  if (field.control === 'toggle') {
    if (typeof value !== 'boolean') {
      addError(errors, path, `${field.label}必须是开关值`);
    }
    return errors;
  }

  if (field.control === 'select') {
    if (typeof value !== 'string' || !value) {
      addError(errors, path, `${field.label}必须选择一个选项`);
    } else if (field.options && !field.options.some((option) => option.value === value)) {
      addError(errors, path, `${field.label}包含不支持的选项`);
    }
    return errors;
  }

  if (field.control === 'string-list' || field.control === 'object-list') {
    if (!Array.isArray(value)) {
      addError(errors, path, `${field.label}必须是列表`);
      return errors;
    }
    if (constraints.minItems !== undefined && value.length < constraints.minItems) {
      addError(errors, path, `${field.label}至少需要 ${constraints.minItems} 项`);
    }
    if (constraints.maxItems !== undefined && value.length > constraints.maxItems) {
      addError(errors, path, `${field.label}最多允许 ${constraints.maxItems} 项`);
    }
    if (field.control === 'string-list') {
      value.forEach((item, index) => {
        validateFieldValue({
          label: `${field.label} ${index + 1}`,
          control: 'text',
          required: true,
          constraints: field.item?.constraints,
        }, item, `${path}[${index}]`, errors);
      });
    } else {
      value.forEach((item, index) => {
        field.itemFields.forEach((itemField) => {
          validateFieldValue(
            itemField,
            item?.[itemField.key],
            `${path}[${index}].${itemField.path}`,
            errors,
          );
        });
      });
    }
  }
  return errors;
}

function blockVariant(manifest, section) {
  const block = manifest.blocks.find((entry) => entry.type === section.type);
  return {
    block,
    variant: block?.variants.find((entry) => entry.value === section.variant),
  };
}

export function validateEditorConfig(config, manifest) {
  const errors = [];
  if (!config || !manifest) {
    return errors;
  }

  manifest.page.fields.forEach((field) => {
    validateFieldValue(field, config.page?.[field.key], `page.${field.path}`, errors);
  });
  manifest.theme.fields.forEach((field) => {
    validateFieldValue(field, config.theme?.[field.key], `theme.${field.path}`, errors);
  });

  if (!Array.isArray(config.sections)) {
    addError(errors, 'sections', '区块列表无效');
    return errors;
  }

  const ids = new Set();
  config.sections.forEach((section, index) => {
    const base = `sections[${index}]`;
    manifest.section.commonFields.forEach((field) => {
      validateFieldValue(field, section?.[field.key], `${base}.${field.path}`, errors);
    });
    if (ids.has(section.id)) {
      addError(errors, `${base}.id`, `区块 ID “${section.id}” 重复`);
    }
    ids.add(section.id);

    const { block, variant } = blockVariant(manifest, section);
    if (!block) {
      addError(errors, `${base}.type`, '区块类型不受支持');
      return;
    }
    if (!variant) {
      addError(errors, `${base}.variant`, '区块布局不受支持');
      return;
    }
    variant.fields.forEach((field) => {
      validateFieldValue(field, section.data?.[field.key], `${base}.data.${field.path}`, errors);
    });
    variant.rules.forEach((rule) => {
      if (rule.kind !== 'sum') {
        return;
      }
      const items = getAtPath(section.data, rule.path);
      if (!Array.isArray(items)) {
        return;
      }
      const total = items.reduce((sum, item) => sum + (Number(item?.[rule.field]) || 0), 0);
      if (Math.abs(total - rule.target) > rule.tolerance) {
        addError(errors, `${base}.data.${rule.path}`, `${rule.message}，当前为 ${total}`);
      }
    });
  });

  if (!config.sections.some((section) => section.enabled)) {
    addError(errors, 'sections', '至少需要启用一个区块');
  }
  return errors;
}

export function errorsAtPath(errors, pathValue, { includeChildren = false } = {}) {
  return errors.filter((error) => error.path === pathValue
    || (includeChildren && (error.path.startsWith(`${pathValue}.`) || error.path.startsWith(`${pathValue}[`))));
}

export function createLatestRequestGuard() {
  let sequence = 0;
  return {
    begin() {
      const current = ++sequence;
      return {
        id: current,
        isLatest: () => current === sequence,
      };
    },
    invalidate() {
      sequence += 1;
    },
  };
}
