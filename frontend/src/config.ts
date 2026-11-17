export const getApiBase = (): string => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000';

  // 1. User manual override (persisted in localStorage)
  const customUrl = localStorage.getItem('sonora_server_url');
  if (customUrl) return customUrl.replace(/\/+$/, '');

  // 2. Capacitor Android/iOS native runtime detection
  const isCapacitor =
    !!(window as any).Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && typeof (window as any).Capacitor !== 'undefined');

  if (isCapacitor) {
    // Default to the host PC LAN address on the local network
    return 'http://192.168.1.101:8000';
  }

  // 3. Web browser running on HTTP/HTTPS
  if (window.location.protocol.startsWith('http')) {
    return '';
  }

  // 4. Electron file:// protocol fallback
  return 'http://127.0.0.1:8000';
};

export const API_BASE = getApiBase();

export const setApiBase = (url: string) => {
  if (typeof window !== 'undefined') {
    if (url) {
      localStorage.setItem('sonora_server_url', url.replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('sonora_server_url');
    }
    window.location.reload();
  }
};
