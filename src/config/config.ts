// Local environment configuration
export const CONFIG = {
  ENVIRONMENT: 'local',
  getSocketUrl: () => {
    console.log('🔧 CONFIG: Using LOCAL environment');
    return 'http://192.168.29.30:3000';
  },
  WEBRTC_STUN_SERVERS:
    'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302',
  SOCKET_TIMEOUT: 20000,
  SOCKET_RECONNECTION_ATTEMPTS: 5,
  SOCKET_RECONNECTION_DELAY: 1000,
  SOCKET_RECONNECTION_DELAY_MAX: 5000,
  DEBUG: true,
  LOG_LEVEL: 'debug',
};
