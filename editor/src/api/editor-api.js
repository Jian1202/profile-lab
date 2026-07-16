export class EditorApiError extends Error {
  constructor(message, { code = 'REQUEST_FAILED', path, status } = {}) {
    super(message);
    this.name = 'EditorApiError';
    this.code = code;
    this.path = path;
    this.status = status;
  }
}

export async function requestEditor(endpoint, { method = 'GET', body, timeout = 10000 } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = response.status === 304 ? null : await response.json();

    if (!response.ok) {
      throw new EditorApiError(payload?.error?.message || '编辑器请求失败。', {
        code: payload?.error?.code,
        path: payload?.error?.path,
        status: response.status,
      });
    }
    return payload?.data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new EditorApiError('请求超时，请检查本地编辑器服务。', { code: 'REQUEST_TIMEOUT' });
    }
    if (error instanceof EditorApiError) {
      throw error;
    }
    throw new EditorApiError('无法连接本地编辑器服务。', { code: 'NETWORK_ERROR' });
  } finally {
    window.clearTimeout(timer);
  }
}

export const editorApi = {
  config: () => requestEditor('/api/editor/config'),
  manifest: () => requestEditor('/api/editor/manifest'),
  reload: () => requestEditor('/api/editor/config'),
  render: (config) => requestEditor('/api/editor/render', { method: 'POST', body: { config } }),
  rollback: () => requestEditor('/api/editor/rollback', { method: 'POST', body: {} }),
  save: (config) => requestEditor('/api/editor/save', { method: 'PUT', body: { config } }),
  session: () => requestEditor('/api/editor/session'),
  validate: (config) => requestEditor('/api/editor/validate', { method: 'POST', body: { config } }),
};
