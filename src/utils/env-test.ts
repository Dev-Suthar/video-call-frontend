import {SOCKET_SERVER_URL} from '@env';

export const testEnvironmentVariables = () => {
  console.log('🔍 Environment Test:');
  console.log('SOCKET_SERVER_URL:', SOCKET_SERVER_URL);
  console.log('Type of SOCKET_SERVER_URL:', typeof SOCKET_SERVER_URL);
  console.log('Is SOCKET_SERVER_URL defined:', SOCKET_SERVER_URL !== undefined);
  console.log('Is SOCKET_SERVER_URL truthy:', !!SOCKET_SERVER_URL);
  
  return {
    socketUrl: SOCKET_SERVER_URL,
    isDefined: SOCKET_SERVER_URL !== undefined,
    isTruthy: !!SOCKET_SERVER_URL
  };
}; 