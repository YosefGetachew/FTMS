const baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://ftms.moa.gov.et/api';
let authToken = '';

export const apiOrigin = baseURL.replace(/\/api\/?$/, '');

const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseURL.replace(/\/$/, '')}/${String(path || '').replace(/^\//, '')}`;
};

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (method, path, body, config = {}) => {
  const headers = { ...(config.headers || {}) };
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  const options = {
    method,
    headers,
  };

  if (authToken && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (body !== undefined && body !== null) {
    if (isFormData) {
      delete headers['Content-Type'];
      delete headers['content-type'];
      options.body = body;
    } else {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(buildUrl(path), options);
  const data = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(
      data?.error || data?.message || `HTTP ${response.status}`
    );
    error.response = { status: response.status, data };
    throw error;
  }

  return { data, status: response.status };
};

const API = {
  get: (path, config) => request('GET', path, undefined, config),
  post: (path, body, config) => request('POST', path, body, config),
  put: (path, body, config) => request('PUT', path, body, config),
  delete: (path, config) => request('DELETE', path, undefined, config),
};

export function setAuthToken(token) {
  authToken = token || '';
}

export function getApiErrorMessage(error, fallback = 'Request failed.') {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return `${fallback} ${error.message}`;
  return fallback;
}

export default API;
