export function getApiBase(): string {
  // Primary source: environment variable injected at build time
  const env = import.meta.env.VITE_API_BASE;
  if (env && env !== '') {
    return env;
  }

  // Default to same-origin proxy in dev to avoid CORS/mixed-content issues.
  return '/api';
}

export function getWsBase(): string {
  const apiBase = getApiBase();
  if (apiBase.startsWith('/')) {
    if (typeof window === 'undefined') {
      return apiBase;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${apiBase}`;
  }
  if (apiBase.startsWith('https://')) {
    return `wss://${apiBase.slice('https://'.length)}`;
  }
  if (apiBase.startsWith('http://')) {
    return `ws://${apiBase.slice('http://'.length)}`;
  }
  return apiBase;
}
