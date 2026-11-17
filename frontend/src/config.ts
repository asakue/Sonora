import { Capacitor } from '@capacitor/core';

/**
 * Sonora API Base Configuration.
 * Handles environment-specific API endpoint resolution:
 * - Desktop Electron (local FastAPI instance)
 * - Android / iOS Mobile (Capacitor native shell)
 * - Production Web
 * - User custom server override
 */

export const getApiBase = (): string => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000';

  // 1. User manual override (persisted in localStorage)
  const customUrl = localStorage.getItem('sonora_server_url');
  if (customUrl) return customUrl.replace(/\/+$/, '');

  // 2. Capacitor Android/iOS native runtime detection
  const isCapacitor =
    Capacitor.isNativePlatform() ||
    !!(window as any).Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && !window.location.port) ||
    (window.location.protocol === 'http:' && window.location.hostname === 'localhost' && typeof (window as any).Capacitor !== 'undefined') ||
    (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && typeof (window as any).Capacitor !== 'undefined');

  if (isCapacitor) {
    // Primary cloud API endpoint accessible from any mobile cellular (4G/5G) or Wi-Fi network worldwide
    return 'https://sonora-five-lac.vercel.app';
  }

  // 3. Web browser running on HTTP/HTTPS
  if (window.location.protocol.startsWith('http')) {
    // In production web, requests to /api are handled by same-origin rewrites
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
