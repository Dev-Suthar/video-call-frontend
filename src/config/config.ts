// Live environment configuration
export const CONFIG = {
  ENVIRONMENT: 'live',
  getSocketUrl: () => {
    console.log('🔧 CONFIG: Using LIVE environment');
    return 'https://video-call-backend-uifd.onrender.com';
  },
  WEBRTC_STUN_SERVERS:
    'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302',
  WEBRTC_TURN_SERVERS: '',
  SOCKET_TIMEOUT: 20000,
  SOCKET_RECONNECTION_ATTEMPTS: 5,
  SOCKET_RECONNECTION_DELAY: 1000,
  SOCKET_RECONNECTION_DELAY_MAX: 5000,
  DEBUG: false,
  LOG_LEVEL: 'info',
};
