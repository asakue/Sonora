export const API_BASE =
  typeof window !== 'undefined' && window.location.protocol.startsWith('http')
    ? ''
    : 'http://127.0.0.1:8000';

