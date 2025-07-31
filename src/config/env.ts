// Direct environment configuration
// This file reads environment variables directly as a fallback

export const ENV_CONFIG = {
  SOCKET_SERVER_URL: process.env.SOCKET_SERVER_URL || 'http://192.168.29.30:3000',
  WEBRTC_STUN_SERVERS: process.env.WEBRTC_STUN_SERVERS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302',
  SOCKET_TIMEOUT: process.env.SOCKET_TIMEOUT || '20000',
  SOCKET_RECONNECTION_ATTEMPTS: process.env.SOCKET_RECONNECTION_ATTEMPTS || '5',
  SOCKET_RECONNECTION_DELAY: process.env.SOCKET_RECONNECTION_DELAY || '1000',
  SOCKET_RECONNECTION_DELAY_MAX: process.env.SOCKET_RECONNECTION_DELAY_MAX || '5000',
  DEBUG: process.env.DEBUG || 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
};

console.log('🔧 ENV_CONFIG loaded:', ENV_CONFIG); 