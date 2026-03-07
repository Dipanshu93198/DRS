export function getApiBase(): string {
  // Primary source: environment variable injected at build time
  const env = import.meta.env.VITE_API_BASE;
  if (env && env !== '') {
    return env;
  }

  // If running in a Codespaces preview or similar "<name>-<port>.githubpreview.dev"
  // we can attempt to derive the backend URL by swapping the port to 8000.
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname.endsWith('githubpreview.dev')) {
      const parts = hostname.split('-');
      if (parts.length >= 2) {
        // replace the last segment (which is the current port) with 8000
        parts[parts.length - 1] = '8000';
        const backendHost = parts.join('-');
        return `${protocol}//${backendHost}`;
      }
    }

    // fallback: use same host with port 8000
    return `${protocol}//${hostname}:8000`;
  }

  // default to localhost for non-browser environments (e.g. tests)
  return 'http://localhost:8000';
}
