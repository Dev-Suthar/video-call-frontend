import { io, Socket } from 'socket.io-client';

export const createSocketConnection = (serverUrl: string): Socket => {
  return io(serverUrl, {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });
};

export const setupSocketEventHandlers = (
  socket: Socket,
  onConnect: () => void,
  onDisconnect: () => void,
  onError: (error: any) => void
): void => {
  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
    onConnect();
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
    onDisconnect();
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 Socket connection error:', error);
    onError(error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
    onConnect();
  });

  socket.on('reconnect_error', (error) => {
    console.error('🔌 Socket reconnection error:', error);
    onError(error);
  });

  socket.on('reconnect_failed', () => {
    console.error('🔌 Socket reconnection failed');
    onError(new Error('Reconnection failed'));
  });
};

export const disconnectSocket = (socket: Socket | null): void => {
  if (socket) {
    console.log('🔌 Disconnecting socket:', socket.id);
    socket.disconnect();
  }
};

export const isSocketConnected = (socket: Socket | null): boolean => {
  return socket !== null && socket.connected;
};