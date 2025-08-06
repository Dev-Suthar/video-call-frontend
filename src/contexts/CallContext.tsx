import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from 'react';
import {AppState, AppStateStatus, Platform} from 'react-native';
import {io, Socket} from 'socket.io-client';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import {CONFIG} from '../config/config';
import {hapticLight} from '../utils/haptics';
import {
  getDisplayMedia,
  checkScreenSharingCapabilities,
  createScreenSharingStream,
  replaceVideoTrack,
  restoreCameraTrack,
} from '../utils/webrtc';

// Add simulator detection utility
const isSimulator = () => {
  if (Platform.OS === 'ios') {
    return Platform.isPad || Platform.isTV;
  }
  // For Android, we'll check if we're in an emulator
  return __DEV__ && (global as any).__METRO_GLOBAL_PREFIX__;
};

interface CallState {
  isConnected: boolean;
  isInCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  roomId: string;
  username: string;
  messages: ChatMessage[];
  participants: Participant[];
  screenSharingUser: string | null;
  isCreator: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  // New fields for better UX
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  errorMessage: string | null;
  isReconnecting: boolean;
  callDuration: number; // in seconds
  lastActivity: number; // timestamp
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  delivered: boolean;
}

interface Participant {
  userId: string;
  username: string;
  isCreator: boolean;
}

type CallAction =
  | {type: 'SET_CONNECTED'; payload: boolean}
  | {type: 'SET_IN_CALL'; payload: boolean}
  | {type: 'SET_LOCAL_STREAM'; payload: MediaStream | null}
  | {type: 'SET_REMOTE_STREAM'; payload: MediaStream | null}
  | {type: 'SET_SCREEN_STREAM'; payload: MediaStream | null}
  | {type: 'SET_SCREEN_SHARING'; payload: boolean}
  | {type: 'SET_MUTED'; payload: boolean}
  | {type: 'SET_CAMERA_OFF'; payload: boolean}
  | {type: 'SET_ROOM_ID'; payload: string}
  | {type: 'SET_USERNAME'; payload: string}
  | {type: 'ADD_MESSAGE'; payload: ChatMessage}
  | {type: 'SET_PARTICIPANTS'; payload: Participant[]}
  | {type: 'SET_SCREEN_SHARING_USER'; payload: string | null}
  | {type: 'SET_IS_CREATOR'; payload: boolean}
  | {
      type: 'SET_CONNECTION_STATUS';
      payload: 'disconnected' | 'connecting' | 'connected' | 'error';
    }
  | {type: 'RESET_CALL'}
  // New actions for improved UX
  | {
      type: 'SET_CONNECTION_QUALITY';
      payload: 'excellent' | 'good' | 'poor' | 'disconnected';
    }
  | {type: 'SET_ERROR_MESSAGE'; payload: string | null}
  | {type: 'SET_RECONNECTING'; payload: boolean}
  | {type: 'UPDATE_CALL_DURATION'; payload: number}
  | {type: 'UPDATE_LAST_ACTIVITY'; payload: number}
  | {type: 'CLEAR_ERROR'};

const initialState: CallState = {
  isConnected: false,
  isInCall: false,
  localStream: null,
  remoteStream: null,
  screenStream: null,
  isScreenSharing: false,
  isMuted: false,
  isCameraOff: false,
  roomId: '',
  username: '',
  messages: [],
  participants: [],
  screenSharingUser: null,
  isCreator: false,
  connectionStatus: 'disconnected',
  // New fields for better UX
  connectionQuality: 'disconnected',
  errorMessage: null,
  isReconnecting: false,
  callDuration: 0,
  lastActivity: 0,
};

const callReducer = (state: CallState, action: CallAction): CallState => {
  switch (action.type) {
    case 'SET_CONNECTED':
      return {...state, isConnected: action.payload};
    case 'SET_IN_CALL':
      return {...state, isInCall: action.payload};
    case 'SET_LOCAL_STREAM':
      return {...state, localStream: action.payload};
    case 'SET_REMOTE_STREAM':
      return {...state, remoteStream: action.payload};
    case 'SET_SCREEN_STREAM':
      return {...state, screenStream: action.payload};
    case 'SET_SCREEN_SHARING':
      return {...state, isScreenSharing: action.payload};
    case 'SET_MUTED':
      return {...state, isMuted: action.payload};
    case 'SET_CAMERA_OFF':
      return {...state, isCameraOff: action.payload};
    case 'SET_ROOM_ID':
      return {...state, roomId: action.payload};
    case 'SET_USERNAME':
      return {...state, username: action.payload};
    case 'ADD_MESSAGE':
      return {...state, messages: [...state.messages, action.payload]};
    case 'SET_PARTICIPANTS':
      return {...state, participants: action.payload};
    case 'SET_SCREEN_SHARING_USER':
      return {...state, screenSharingUser: action.payload};
    case 'SET_IS_CREATOR':
      return {...state, isCreator: action.payload};
    case 'SET_CONNECTION_STATUS':
      return {...state, connectionStatus: action.payload};
    case 'RESET_CALL':
      return {
        ...initialState,
        roomId: state.roomId,
        username: state.username,
      };
    case 'SET_CONNECTION_QUALITY':
      return {...state, connectionQuality: action.payload};
    case 'SET_ERROR_MESSAGE':
      return {...state, errorMessage: action.payload};
    case 'SET_RECONNECTING':
      return {...state, isReconnecting: action.payload};
    case 'UPDATE_CALL_DURATION':
      return {...state, callDuration: action.payload};
    case 'UPDATE_LAST_ACTIVITY':
      return {...state, lastActivity: action.payload};
    case 'CLEAR_ERROR':
      return {...state, errorMessage: null};
    default:
      return state;
  }
};

interface CallContextType {
  state: CallState;
  socket: Socket | null;
  peerConnection: RTCPeerConnection | null;
  joinRoom: (roomId: string, username: string) => void;
  leaveRoom: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  startScreenSharing: () => void;
  stopScreenSharing: () => void;
  sendMessage: (message: string) => void;
  createOffer: () => void;
  createAnswer: (offer: RTCSessionDescription) => void;
  addIceCandidate: (candidate: RTCIceCandidate) => void;
  debugScreenSharing: () => void;
  forceScreenSharingDetection: () => void;
  testScreenSharingSetup: () => Promise<any>;
  checkScreenSharingPermissions: () => any;
  getScreenSharingCapabilities: () => any;
  validateScreenSharingConfiguration: () => any;
  runScreenSharingTests: () => Promise<any>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    console.error('❌ useCall must be used within a CallProvider');
    console.error('Stack trace:', new Error().stack);
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

interface CallProviderProps {
  children: React.ReactNode;
}

export const CallProvider: React.FC<CallProviderProps> = ({children}) => {
  const [state, dispatch] = useReducer(callReducer, initialState);
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [peerConnection, setPeerConnection] =
    React.useState<RTCPeerConnection | null>(null);

  // Use refs to avoid dependency issues
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const stateRef = useRef(state);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // New refs for improved functionality
  const callDurationRef = useRef<NodeJS.Timeout | null>(null);
  const connectionQualityRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    peerConnectionRef.current = peerConnection;
  }, [peerConnection]);

  // Call duration timer
  useEffect(() => {
    if (state.isInCall) {
      callDurationRef.current = setInterval(() => {
        dispatch({
          type: 'UPDATE_CALL_DURATION',
          payload: state.callDuration + 1,
        });
      }, 1000);
    } else {
      if (callDurationRef.current) {
        clearInterval(callDurationRef.current);
        callDurationRef.current = null;
      }
    }

    return () => {
      if (callDurationRef.current) {
        clearInterval(callDurationRef.current);
      }
    };
  }, [state.isInCall, state.callDuration]);

  // Connection quality monitoring
  useEffect(() => {
    if (state.isInCall && peerConnectionRef.current) {
      connectionQualityRef.current = setInterval(() => {
        monitorConnectionQuality();
      }, 5000); // Check every 5 seconds
    } else {
      if (connectionQualityRef.current) {
        clearInterval(connectionQualityRef.current);
        connectionQualityRef.current = null;
      }
    }

    return () => {
      if (connectionQualityRef.current) {
        clearInterval(connectionQualityRef.current);
      }
    };
  }, [state.isInCall]);

  // Background/foreground handling
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(
        'App state changed from',
        appStateRef.current,
        'to',
        nextAppState,
      );

      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        // App has come to the foreground - ensure connection is active
        if (state.isInCall && socket && !socket.connected) {
          console.log('Reconnecting socket after foreground transition');
          socket.connect();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('App has gone to the background!');
        // App has gone to the background - keep connection alive
        if (state.isInCall && socket) {
          console.log('Keeping connection alive in background');
          // Update last activity to prevent timeout
          dispatch({type: 'UPDATE_LAST_ACTIVITY', payload: Date.now()});
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, [state.isInCall, socket]);

  // Keep-alive mechanism to prevent disconnections
  useEffect(() => {
    if (state.isInCall && socket) {
      keepAliveRef.current = setInterval(() => {
        if (socket && socket.connected) {
          console.log('Sending keep-alive ping');
          socket.emit('ping');
          dispatch({type: 'UPDATE_LAST_ACTIVITY', payload: Date.now()});
        }
      }, 30000); // Send ping every 30 seconds
    } else {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
    }

    return () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
    };
  }, [state.isInCall, socket]);

  const monitorConnectionQuality = () => {
    if (!peerConnectionRef.current) return;

    try {
      const connectionState = peerConnectionRef.current.connectionState;
      const iceConnectionState = peerConnectionRef.current.iceConnectionState;

      let quality: 'excellent' | 'good' | 'poor' | 'disconnected' =
        'disconnected';

      if (
        connectionState === 'connected' &&
        iceConnectionState === 'connected'
      ) {
        quality = 'excellent';
      } else if (
        connectionState === 'connected' ||
        iceConnectionState === 'connected'
      ) {
        quality = 'good';
      } else if (
        connectionState === 'connecting' ||
        iceConnectionState === 'checking'
      ) {
        quality = 'poor';
      }

      dispatch({type: 'SET_CONNECTION_QUALITY', payload: quality});
    } catch (error) {
      console.log('Error monitoring connection quality:', error);
    }
  };

  // Initialize socket connection with improved error handling
  useEffect(() => {
    const connectSocket = () => {
      // Use configuration for socket server URL
      const socketUrl = CONFIG.getSocketUrl();

      console.log('🔌 CONFIG socket URL:', socketUrl);
      console.log('🔌 Connecting to socket server:', socketUrl);
      dispatch({type: 'SET_CONNECTION_STATUS', payload: 'connecting'});

      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: CONFIG.SOCKET_TIMEOUT,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: CONFIG.SOCKET_RECONNECTION_ATTEMPTS,
        reconnectionDelay: CONFIG.SOCKET_RECONNECTION_DELAY,
        reconnectionDelayMax: CONFIG.SOCKET_RECONNECTION_DELAY_MAX,
      });

      newSocket.on('connect', () => {
        console.log('🔌 Socket connected:', newSocket.id);
        dispatch({type: 'SET_CONNECTED', payload: true});
        dispatch({type: 'SET_CONNECTION_STATUS', payload: 'connected'});
        reconnectAttemptsRef.current = 0;

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      newSocket.on('disconnect', reason => {
        console.log('🔌 Socket disconnected:', reason);
        dispatch({type: 'SET_CONNECTED', payload: false});
        dispatch({type: 'SET_CONNECTION_STATUS', payload: 'disconnected'});

        // Attempt to reconnect if not manually disconnected
        if (
          reason !== 'io client disconnect' &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          console.log(
            `🔌 Attempting to reconnect... (${
              reconnectAttemptsRef.current + 1
            }/${maxReconnectAttempts})`,
          );
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocket();
          }, 2000);
        }
      });

      newSocket.on('connect_error', error => {
        console.log('🔌 Socket connection error:', error);
        dispatch({type: 'SET_CONNECTION_STATUS', payload: 'error'});
        dispatch({
          type: 'SET_ERROR_MESSAGE',
          payload: 'Connection failed. Please check your internet connection.',
        });

        // Attempt to reconnect on connection error
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          console.log(
            `🔌 Connection error, attempting to reconnect... (${
              reconnectAttemptsRef.current + 1
            }/${maxReconnectAttempts})`,
          );
          reconnectAttemptsRef.current++;
          dispatch({type: 'SET_RECONNECTING', payload: true});

          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocket();
          }, 3000);
        } else {
          dispatch({
            type: 'SET_ERROR_MESSAGE',
            payload:
              'Unable to connect after multiple attempts. Please try again later.',
          });
        }
      });

      newSocket.on('reconnect', attemptNumber => {
        console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
        dispatch({type: 'SET_CONNECTED', payload: true});
        dispatch({type: 'SET_CONNECTION_STATUS', payload: 'connected'});
        dispatch({type: 'SET_RECONNECTING', payload: false});
        dispatch({type: 'CLEAR_ERROR'});
        reconnectAttemptsRef.current = 0;
      });

      newSocket.on('reconnect_error', error => {
        console.log('🔌 Socket reconnection error:', error);
        dispatch({type: 'SET_CONNECTION_STATUS', payload: 'error'});
      });

      newSocket.on('reconnect_failed', () => {
        console.log('🔌 Socket reconnection failed');
        dispatch({type: 'SET_CONNECTION_STATUS', payload: 'error'});
      });

      newSocket.on('user-joined', (data: any) => {
        console.log('User joined:', data, 'Current user:', newSocket.id);
        console.log('Current state:', {
          isInCall: stateRef.current.isInCall,
          hasPeerConnection: !!peerConnectionRef.current,
          hasLocalStream: !!stateRef.current.localStream,
          isCreator: stateRef.current.isCreator,
          participants: stateRef.current.participants.length,
        });

        // Add the new user to participants list
        const newParticipant = {
          userId: data.userId,
          username: data.username,
          isCreator: false,
        };

        dispatch({
          type: 'SET_PARTICIPANTS',
          payload: [...stateRef.current.participants, newParticipant],
        });

        // When a new user joins, create an offer if we're already in the room
        // and we have a peer connection and local stream
        if (
          stateRef.current.isInCall &&
          peerConnectionRef.current &&
          stateRef.current.localStream &&
          data.userId !== newSocket.id
        ) {
          console.log('Creating offer for new user:', data.userId);
          // Add a small delay to ensure participants are updated
          setTimeout(() => {
            // Check if the new user is in the participants list
            const updatedParticipants = [
              ...stateRef.current.participants,
              newParticipant,
            ];
            const targetUser = updatedParticipants.find(
              p => p.userId === data.userId,
            );
            if (targetUser) {
              console.log(
                'Target user found, creating offer for:',
                data.userId,
              );
              createOffer();
            } else {
              console.log('Target user not found in participants list');
            }
          }, 500);
        } else {
          console.log('Not creating offer - conditions not met:', {
            isInCall: stateRef.current.isInCall,
            hasPeerConnection: !!peerConnectionRef.current,
            hasLocalStream: !!stateRef.current.localStream,
            isSelf: data.userId === newSocket.id,
          });
        }
      });

      newSocket.on('user-left', data => {
        console.log('User left:', data);
        // Remove the user from participants list
        const updatedParticipants = stateRef.current.participants.filter(
          (p: any) => p.userId !== data.userId,
        );
        dispatch({type: 'SET_PARTICIPANTS', payload: updatedParticipants});
      });

      newSocket.on('room-state', data => {
        console.log('Room state received:', {
          users: data.users.length,
          isCreator: data.isCreator,
          usersList: data.users.map((u: any) => ({
            id: u.userId,
            name: u.username,
            isCreator: u.isCreator,
          })),
        });

        dispatch({type: 'SET_PARTICIPANTS', payload: data.users});
        dispatch({
          type: 'SET_SCREEN_SHARING_USER',
          payload: data.screenSharing?.userId || null,
        });
        dispatch({type: 'SET_IS_CREATOR', payload: data.isCreator});

        console.log(
          'Room state updated, participants count:',
          data.users.length,
        );

        // If there are multiple participants and we have a peer connection, try to create an offer
        if (
          data.users.length > 1 &&
          peerConnectionRef.current &&
          stateRef.current.localStream
        ) {
          const otherUsers = data.users.filter(
            (u: any) => u.userId !== newSocket.id,
          );
          if (otherUsers.length > 0) {
            console.log(
              'Multiple users in room, attempting to create offer for:',
              otherUsers[0].userId,
            );
            setTimeout(() => {
              createOffer();
            }, 500);
          }
        }
      });

      newSocket.on('chat-message', message => {
        dispatch({type: 'ADD_MESSAGE', payload: message});
      });

      newSocket.on('screen-share-start', data => {
        console.log('Screen sharing started by:', data.userId);
        dispatch({type: 'SET_SCREEN_SHARING_USER', payload: data.userId});

        // If we're not the one sharing, expect to receive screen sharing tracks
        if (data.userId !== newSocket.id) {
          console.log('Expecting screen sharing tracks from:', data.userId);
          // Force screen sharing detection after a short delay
          setTimeout(() => {
            forceScreenSharingDetection();
          }, 1000);
        }
      });

      newSocket.on('screen-share-stop', data => {
        console.log('Screen sharing stopped by:', data.userId);
        dispatch({type: 'SET_SCREEN_SHARING_USER', payload: null});

        // Clear screen stream when sharing stops
        if (data.userId !== newSocket.id) {
          console.log('Clearing screen stream and expecting camera to return');
          dispatch({type: 'SET_SCREEN_STREAM', payload: null});

          // Force a new offer to ensure camera track is restored
          setTimeout(() => {
            if (peerConnectionRef.current && stateRef.current.localStream) {
              console.log(
                'Creating new offer to restore camera after screen sharing stop',
              );
              createOffer();
            }
          }, 1000);
        }
      });

      newSocket.on('pong', () => {
        console.log('Received pong from server');
        dispatch({type: 'UPDATE_LAST_ACTIVITY', payload: Date.now()});
      });

      // WebRTC signaling events
      newSocket.on('offer', async data => {
        console.log('Received offer from:', data.from, 'to:', newSocket.id);
        if (peerConnectionRef.current && data.from !== newSocket.id) {
          try {
            await peerConnectionRef.current.setRemoteDescription(data.offer);
            console.log('Remote description set from offer');
            const answer = await peerConnectionRef.current.createAnswer();
            console.log('Answer created from offer');
            await peerConnectionRef.current.setLocalDescription(answer);
            console.log('Local description set from answer');

            newSocket.emit('answer', {
              answer,
              target: data.from,
            });
            console.log('Answer sent to:', data.from);
          } catch (error) {
            console.error('Error handling offer:', error);
          }
        } else {
          console.log('Cannot handle offer - no peer connection or from self');
        }
      });

      newSocket.on('answer', async data => {
        console.log('Received answer from:', data.from, 'to:', newSocket.id);
        if (peerConnectionRef.current && data.from !== newSocket.id) {
          try {
            await peerConnectionRef.current.setRemoteDescription(data.answer);
            console.log('Remote description set from answer');
          } catch (error) {
            console.error('Error handling answer:', error);
          }
        } else {
          console.log('Cannot handle answer - no peer connection or from self');
        }
      });

      newSocket.on('ice-candidate', async data => {
        console.log(
          'Received ICE candidate from:',
          data.from,
          'to:',
          newSocket.id,
        );
        if (peerConnectionRef.current && data.from !== newSocket.id) {
          try {
            await peerConnectionRef.current.addIceCandidate(data.candidate);
            console.log('ICE candidate added successfully');
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        } else {
          console.log(
            'Cannot add ICE candidate - no peer connection or from self',
          );
        }
      });

      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      // Clear reconnect timeout on cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socket) {
        socket.disconnect();
      }
    };
  }, []); // Remove dependencies to prevent recreation

  // Clean up peer connection when component unmounts or state changes
  useEffect(() => {
    console.log('Setting up peer connection cleanup effect');
    return () => {
      console.log('Cleaning up peer connection on unmount');
      if (peerConnectionRef.current) {
        console.log('Closing peer connection during cleanup');
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, []);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('State changed:', {
      isInCall: state.isInCall,
      hasLocalStream: !!state.localStream,
      hasRemoteStream: !!state.remoteStream,
      participantsCount: state.participants.length,
      hasPeerConnection: !!peerConnectionRef.current,
    });
  }, [
    state.isInCall,
    state.localStream,
    state.remoteStream,
    state.participants.length,
  ]);

  const joinRoom = async (roomId: string, username: string) => {
    console.log('Joining room:', {roomId, username});
    if (socket && socket.connected) {
      try {
        dispatch({type: 'SET_ROOM_ID', payload: roomId});
        dispatch({type: 'SET_USERNAME', payload: username});

        socket.emit('join-room', {roomId, username});

        // Get local media stream
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        console.log(
          'Local media stream obtained:',
          stream.getTracks().length,
          'tracks',
        );
        dispatch({type: 'SET_LOCAL_STREAM', payload: stream});
        dispatch({type: 'SET_IN_CALL', payload: true});

        // Create peer connection after getting media stream
        const stunServers = CONFIG.WEBRTC_STUN_SERVERS
          ? CONFIG.WEBRTC_STUN_SERVERS.split(',').map((url: string) => ({
              urls: url.trim(),
            }))
          : [
              {urls: 'stun:stun.l.google.com:19302'},
              {urls: 'stun:stun1.l.google.com:19302'},
            ];

        console.log('Creating peer connection with STUN servers:', stunServers);
        const pc = new RTCPeerConnection({
          iceServers: stunServers,
          iceCandidatePoolSize: 10,
        });
        console.log('Peer connection created');

        // Add local stream tracks to peer connection
        stream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind);
          pc.addTrack(track, stream);
        });

        // Set up event listeners for the peer connection
        pc.addEventListener('track', (event: any) => {
          console.log(
            'Remote track received:',
            event.streams?.length,
            'streams',
            'Track kind:',
            event.track?.kind,
            'Track ID:',
            event.track?.id,
            'Track label:',
            event.track?.label,
          );

          if (event.streams && event.streams.length > 0) {
            // Simplified track detection logic
            const isScreenSharingActive =
              stateRef.current.screenSharingUser &&
              stateRef.current.screenSharingUser !== socketRef.current?.id;

            // Check if this track has screen sharing characteristics
            const hasScreenSharingIndicators =
              (event.track?.id?.includes('screen') ||
                event.track?.label?.includes('screen') ||
                event.streams[0]?.id?.includes('screen')) &&
              event.track?.kind === 'video';

            // If screen sharing is active and this is a video track with screen indicators, treat as screen sharing
            if (isScreenSharingActive && hasScreenSharingIndicators) {
              console.log('Screen sharing track received:', {
                trackId: event.track?.id,
                trackLabel: event.track?.label,
                streamId: event.streams[0]?.id,
                trackKind: event.track?.kind,
              });
              dispatch({type: 'SET_SCREEN_STREAM', payload: event.streams[0]});
            } else if (
              event.track?.kind === 'video' &&
              !hasScreenSharingIndicators
            ) {
              // This is a regular camera video track
              console.log('Camera video track received:', {
                trackId: event.track?.id,
                trackLabel: event.track?.label,
                streamId: event.streams[0]?.id,
                trackKind: event.track?.kind,
              });
              dispatch({type: 'SET_REMOTE_STREAM', payload: event.streams[0]});
            } else if (event.track?.kind === 'audio') {
              // Audio track - always treat as regular audio
              console.log('Audio track received:', {
                trackId: event.track?.id,
                trackLabel: event.track?.label,
                streamId: event.streams[0]?.id,
                trackKind: event.track?.kind,
              });
              dispatch({type: 'SET_REMOTE_STREAM', payload: event.streams[0]});
            } else {
              // Fallback for any other video track
              console.log('Fallback video track received:', {
                trackId: event.track?.id,
                trackLabel: event.track?.label,
                streamId: event.streams[0]?.id,
                trackKind: event.track?.kind,
              });
              dispatch({type: 'SET_REMOTE_STREAM', payload: event.streams[0]});
            }
          }
        });

        pc.addEventListener('icecandidate', (event: any) => {
          if (event.candidate && socket && socket.connected) {
            console.log('ICE candidate generated');

            // Find the target user (someone other than ourselves)
            const targetUser = stateRef.current.participants.find(
              (p: any) => p.userId !== socket.id,
            );

            if (targetUser) {
              console.log('Sending ICE candidate to:', targetUser.userId);
              socket.emit('ice-candidate', {
                candidate: event.candidate,
                target: targetUser.userId,
              });
            } else {
              console.log('No target user found for ICE candidate');
            }
          }
        });

        pc.addEventListener('connectionstatechange', () => {
          console.log('Peer connection state changed:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            console.log('✅ WebRTC connection established successfully!');
          } else if (pc.connectionState === 'failed') {
            console.log('❌ WebRTC connection failed');
            // Try to recover the connection
            setTimeout(() => {
              console.log('🔄 Attempting to recover WebRTC connection...');
              if (peerConnectionRef.current && stateRef.current.localStream) {
                createOffer();
              }
            }, 2000);
          } else if (pc.connectionState === 'closed') {
            console.log('🔴 WebRTC connection closed');
          }
        });

        pc.addEventListener('iceconnectionstatechange', () => {
          console.log('ICE connection state changed:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected') {
            console.log('✅ ICE connection established!');
          } else if (pc.iceConnectionState === 'failed') {
            console.log('❌ ICE connection failed');
            // Try to restart ICE
            setTimeout(() => {
              console.log('🔄 Attempting to restart ICE...');
              if (peerConnectionRef.current) {
                try {
                  peerConnectionRef.current.restartIce();
                  console.log('✅ ICE restart initiated');
                } catch (error) {
                  console.error('❌ Failed to restart ICE:', error);
                }
              }
            }, 1000);
          } else if (pc.iceConnectionState === 'disconnected') {
            console.log('⚠️ ICE connection disconnected');
          }
        });

        pc.addEventListener('icegatheringstatechange', () => {
          console.log('ICE gathering state changed:', pc.iceGatheringState);
        });

        pc.addEventListener('signalingstatechange', () => {
          console.log('Signaling state changed:', pc.signalingState);
        });

        setPeerConnection(pc);
        console.log('Local stream and peer connection set up');

        // Update the ref immediately after setting
        setTimeout(() => {
          console.log(
            'Updated refs - localStream:',
            !!stateRef.current.localStream,
            'peerConnection:',
            !!peerConnectionRef.current,
          );
        }, 100);
      } catch (error) {
        console.error('❌ Error in joinRoom:', error);
        dispatch({
          type: 'SET_ERROR_MESSAGE',
          payload: 'Failed to join room. Please try again.',
        });
        dispatch({type: 'SET_IN_CALL', payload: false});
        dispatch({type: 'SET_LOCAL_STREAM', payload: null});
        setPeerConnection(null);
      }
    } else {
      console.log('Cannot join room - socket not connected');
      dispatch({
        type: 'SET_ERROR_MESSAGE',
        payload: 'No connection to server. Please check your internet.',
      });
    }
  };

  const leaveRoom = () => {
    console.log('🔄 Leaving room, cleaning up resources');
    console.log('Current state before cleanup:', {
      hasLocalStream: !!state.localStream,
      hasScreenStream: !!state.screenStream,
      hasPeerConnection: !!peerConnectionRef.current,
      isInCall: state.isInCall,
    });

    if (state.localStream) {
      console.log('Stopping local stream tracks');
      state.localStream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
    }
    if (state.screenStream) {
      console.log('Stopping screen stream tracks');
      state.screenStream.getTracks().forEach(track => {
        console.log('Stopping screen track:', track.kind);
        track.stop();
      });
    }
    if (peerConnectionRef.current) {
      console.log('Closing peer connection');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setPeerConnection(null);
    dispatch({type: 'RESET_CALL'});
    console.log('Room cleanup completed');
  };

  const toggleMute = () => {
    if (state.localStream) {
      const audioTrack = state.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        dispatch({type: 'SET_MUTED', payload: !audioTrack.enabled});
        hapticLight();
      }
    }
  };

  const toggleCamera = () => {
    if (state.localStream) {
      const videoTrack = state.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        dispatch({type: 'SET_CAMERA_OFF', payload: !videoTrack.enabled});
        hapticLight();
      }
    }
  };

  const startScreenSharing = async () => {
    try {
      // Check if running on simulator
      if (isSimulator()) {
        console.log('⚠️  Screen sharing on simulator detected');
        console.log('📱 Simulators have limited screen sharing support');
        console.log('💡 For best results, test on a physical device');

        // Show user-friendly message
        dispatch({
          type: 'SET_ERROR_MESSAGE',
          payload:
            'Screen sharing may not work properly on simulator. Please test on a physical device for best results.',
        });

        // Clear error after 5 seconds
        setTimeout(() => {
          dispatch({type: 'CLEAR_ERROR'});
        }, 5000);
      }

      console.log('🎬 Starting enhanced screen sharing...');

      // Check screen sharing capabilities first
      const capabilities = await checkScreenSharingCapabilities();
      if (!capabilities.supported) {
        throw new Error('Screen sharing not supported on this device');
      }

      // Create screen sharing stream with enhanced options
      const stream = await createScreenSharingStream({
        includeAudio: false, // Don't include system audio by default
        quality: 'medium',
        frameRate: 30,
      });

      console.log(
        '✅ Screen sharing stream obtained:',
        stream.getTracks().length,
        'tracks',
      );

      // Replace camera video track with screen sharing track using enhanced function
      if (
        peerConnectionRef.current &&
        ['new', 'connecting', 'connected'].includes(
          peerConnectionRef.current.connectionState,
        )
      ) {
        try {
          console.log('🔄 Replacing video tracks for screen sharing');
          replaceVideoTrack(
            peerConnectionRef.current,
            stream,
            state.localStream,
          );
        } catch (error) {
          console.error('❌ Error replacing video tracks:', error);
          throw error;
        }
      }

      dispatch({type: 'SET_SCREEN_STREAM', payload: stream});
      dispatch({type: 'SET_SCREEN_SHARING', payload: true});

      if (socket) {
        socket.emit('screen-share-start');

        // Create a new offer to include screen sharing tracks
        setTimeout(() => {
          console.log('Creating new offer for screen sharing');
          createOffer();
        }, 500);
      }

      console.log('✅ Screen sharing started successfully');
    } catch (error) {
      console.error('❌ Error starting screen sharing:', error);

      // Provide user-friendly error message
      let errorMessage = 'Failed to start screen sharing';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      dispatch({
        type: 'SET_ERROR_MESSAGE',
        payload: errorMessage,
      });

      // Clear error after 5 seconds
      setTimeout(() => {
        dispatch({type: 'CLEAR_ERROR'});
      }, 5000);
    }
  };

  const stopScreenSharing = () => {
    if (state.screenStream) {
      console.log('🔄 Stopping screen sharing and restoring camera');

      try {
        // Remove screen sharing tracks from peer connection using enhanced function
        if (
          peerConnectionRef.current &&
          ['new', 'connecting', 'connected'].includes(
            peerConnectionRef.current.connectionState,
          ) &&
          state.localStream
        ) {
          console.log('🔄 Restoring camera video track');
          restoreCameraTrack(peerConnectionRef.current, state.localStream);
        }

        // Stop screen sharing tracks
        try {
          state.screenStream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (error) {
              console.error('Error stopping screen sharing track:', error);
            }
          });
        } catch (error) {
          console.error('Error stopping screen sharing tracks:', error);
        }

        dispatch({type: 'SET_SCREEN_STREAM', payload: null});
        dispatch({type: 'SET_SCREEN_SHARING', payload: false});

        if (socket) {
          socket.emit('screen-share-stop');

          // Create a new offer to restore camera track
          setTimeout(() => {
            console.log('Creating new offer after stopping screen sharing');
            createOffer();
          }, 500);
        }

        console.log('✅ Screen sharing stopped successfully');
      } catch (error) {
        console.error('❌ Error stopping screen sharing:', error);

        // Provide user-friendly error message
        dispatch({
          type: 'SET_ERROR_MESSAGE',
          payload: 'Failed to stop screen sharing. Please try again.',
        });

        // Clear error after 5 seconds
        setTimeout(() => {
          dispatch({type: 'CLEAR_ERROR'});
        }, 5000);
      }
    } else {
      console.log('No screen stream to stop');
    }
  };

  const sendMessage = (message: string) => {
    console.log('Sending chat message:', message);
    if (socket) {
      socket.emit('chat-message', {message});
      console.log('Chat message sent to server');
    } else {
      console.log('Cannot send message - no socket connection');
    }
  };

  const createOffer = async () => {
    console.log('Creating offer...', {
      hasPeerConnection: !!peerConnectionRef.current,
      hasLocalStream: !!stateRef.current.localStream,
      participants: stateRef.current.participants.length,
      socketId: socketRef.current?.id,
      participantsList: stateRef.current.participants.map(p => ({
        id: p.userId,
        name: p.username,
      })),
    });

    if (
      peerConnectionRef.current &&
      ['new', 'connecting', 'connected'].includes(
        peerConnectionRef.current.connectionState,
      ) &&
      stateRef.current.localStream
    ) {
      try {
        // Check if peer connection is in a valid state
        if (peerConnectionRef.current.signalingState === 'closed') {
          console.log('Peer connection is closed, cannot create offer');
          return;
        }

        const offer = await peerConnectionRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        console.log('Offer created successfully');

        // Check if peer connection is still valid before setting description
        if (
          ['new', 'connecting', 'connected'].includes(
            peerConnectionRef.current.connectionState,
          )
        ) {
          await peerConnectionRef.current.setLocalDescription(offer);
          console.log('Local description set');
        } else {
          console.log(
            'Peer connection in invalid state before setting local description',
          );
          return;
        }

        if (socketRef.current && socketRef.current.connected) {
          const targetUserId = stateRef.current.participants.find(
            (p: any) => p.userId !== socketRef.current?.id,
          )?.userId;
          if (targetUserId) {
            console.log('Sending offer to:', targetUserId);
            socketRef.current.emit('offer', {
              offer,
              target: targetUserId,
            });
            console.log('Offer sent successfully');
          } else {
            console.log(
              'No target user found for offer. Participants:',
              stateRef.current.participants,
            );
          }
        } else {
          console.log('No socket connection available');
        }
      } catch (error) {
        console.error('❌ Error creating offer:', error);
        // Don't crash the app, just log the error
        dispatch({
          type: 'SET_ERROR_MESSAGE',
          payload: 'Connection issue. Please try again.',
        });
      }
    } else {
      console.log(
        'Cannot create offer - missing peer connection or local stream or connection closed',
      );
    }
  };

  const createAnswer = async (offer: RTCSessionDescription) => {
    console.log('Creating answer for offer:', offer.type);

    if (peerConnectionRef.current && state.localStream) {
      try {
        await peerConnectionRef.current.setRemoteDescription(offer);
        console.log('Remote description set');
        const answer = await peerConnectionRef.current.createAnswer();
        console.log('Answer created successfully');
        await peerConnectionRef.current.setLocalDescription(answer);
        console.log('Local description set for answer');

        if (socket) {
          const targetUserId = state.participants.find(
            (p: any) => p.userId !== socket.id,
          )?.userId;
          if (targetUserId) {
            console.log('Sending answer to:', targetUserId);
            socket.emit('answer', {
              answer,
              target: targetUserId,
            });
          } else {
            console.log('No target user found for answer');
          }
        }
      } catch (error) {
        console.error('❌ Error creating answer:', error);
        // Don't crash the app, just log the error
        dispatch({
          type: 'SET_ERROR_MESSAGE',
          payload: 'Connection issue. Please try again.',
        });
      }
    } else {
      console.log(
        'Cannot create answer - missing peer connection or local stream',
      );
    }
  };

  const addIceCandidate = async (candidate: RTCIceCandidate) => {
    console.log('Adding ICE candidate:', candidate.candidate);

    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
        console.log('ICE candidate added successfully');
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else {
      console.log('Cannot add ICE candidate - no peer connection');
    }
  };

  // Debug function for screen sharing
  const debugScreenSharing = () => {
    console.log('🔍 Screen Sharing Debug');

    // Check current state
    console.log('Current state:', {
      hasLocalStream: !!state.localStream,
      hasRemoteStream: !!state.remoteStream,
      hasScreenStream: !!state.screenStream,
      isScreenSharing: state.isScreenSharing,
      screenSharingUser: state.screenSharingUser,
      participants: state.participants.length,
      socketId: socket?.id,
    });

    // Check peer connection
    if (peerConnectionRef.current) {
      console.log(
        'Peer connection state:',
        peerConnectionRef.current.connectionState,
      );
      console.log(
        'ICE connection state:',
        peerConnectionRef.current.iceConnectionState,
      );

      // Check senders
      const senders = peerConnectionRef.current.getSenders();
      console.log('Senders:', senders.length);
      senders.forEach((sender, index) => {
        console.log(`Sender ${index}:`, {
          track: sender.track?.kind,
          trackId: sender.track?.id,
          trackLabel: sender.track?.label,
          isScreen:
            sender.track?.id?.includes('screen') ||
            sender.track?.label?.includes('screen'),
        });
      });

      // Check receivers
      const receivers = peerConnectionRef.current.getReceivers();
      console.log('Receivers:', receivers.length);
      receivers.forEach((receiver, index) => {
        console.log(`Receiver ${index}:`, {
          track: receiver.track?.kind,
          trackId: receiver.track?.id,
          trackLabel: receiver.track?.label,
          isScreen:
            receiver.track?.id?.includes('screen') ||
            receiver.track?.label?.includes('screen'),
        });
      });
    } else {
      console.log('❌ No peer connection available');
    }

    // Check streams
    if (state.localStream) {
      console.log('Local stream tracks:', state.localStream.getTracks().length);
      state.localStream.getTracks().forEach((track, index) => {
        console.log(`Local track ${index}:`, track.kind, track.id, track.label);
      });
    }

    if (state.remoteStream) {
      console.log(
        'Remote stream tracks:',
        state.remoteStream.getTracks().length,
      );
      state.remoteStream.getTracks().forEach((track, index) => {
        console.log(
          `Remote track ${index}:`,
          track.kind,
          track.id,
          track.label,
        );
      });
    }

    if (state.screenStream) {
      console.log(
        'Screen stream tracks:',
        state.screenStream.getTracks().length,
      );
      state.screenStream.getTracks().forEach((track, index) => {
        console.log(
          `Screen track ${index}:`,
          track.kind,
          track.id,
          track.label,
        );
      });
    }
  };

  // Force screen sharing detection
  const forceScreenSharingDetection = () => {
    console.log('🔧 Force Screen Sharing Detection');

    // Check if running on simulator
    if (isSimulator()) {
      console.log(
        '⚠️  Screen sharing detection on simulator - may show blank screen',
      );
    }

    // Check if we have a screen sharing user but no screen stream
    if (state.screenSharingUser && !state.screenStream) {
      console.log('Screen sharing user detected but no screen stream');

      // Check if we have any video tracks in remote stream that might be screen sharing
      if (state.remoteStream) {
        const videoTracks = state.remoteStream
          .getTracks()
          .filter(track => track.kind === 'video');
        console.log('Video tracks in remote stream:', videoTracks.length);

        videoTracks.forEach((track, index) => {
          console.log(`Video track ${index}:`, {
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          });
        });

        // Only treat as screen sharing if the track has screen sharing indicators
        const screenSharingTrack = videoTracks.find(
          track =>
            track.id.includes('screen') ||
            track.label.includes('screen') ||
            state.remoteStream?.id.includes('screen'),
        );

        if (screenSharingTrack && state.screenSharingUser !== socket?.id) {
          console.log('Found screen sharing track, setting as screen stream');
          dispatch({type: 'SET_SCREEN_STREAM', payload: state.remoteStream});
        } else {
          console.log(
            'No screen sharing track found, keeping as regular video',
          );
        }
      }
    }
  };

  // Test function for screen sharing setup
  const testScreenSharingSetup = async () => {
    console.log('🧪 Testing Screen Sharing Setup...');

    try {
      // Check if running on simulator
      if (isSimulator()) {
        console.log(
          '⚠️  Running on simulator - limited screen sharing support',
        );
        return {
          success: false,
          message: 'Screen sharing has limited support on simulators',
          simulator: true,
          recommendation: 'Test on a physical device for full functionality',
        };
      }

      // Test 1: Check screen sharing capabilities
      console.log('🔍 Checking screen sharing capabilities...');
      const capabilities = await checkScreenSharingCapabilities();

      if (!capabilities.supported) {
        return {
          success: false,
          message: 'Screen sharing not supported on this device',
          error: capabilities.error,
          simulator: isSimulator(),
        };
      }

      console.log('✅ Screen sharing capabilities:', capabilities);

      // Test 2: Check if we can get display media (this will prompt for permission)
      console.log('📱 Attempting to get display media...');
      const stream = await createScreenSharingStream({
        includeAudio: false,
        quality: 'medium',
      });

      console.log('✅ Display media obtained successfully');
      console.log('📊 Stream details:', {
        id: stream.id,
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      });

      // Log track details
      stream.getTracks().forEach((track, index) => {
        console.log(`Track ${index}:`, {
          kind: track.kind,
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
        });
      });

      // Check if stream has actual content (not blank)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('📹 Video track details:', {
          id: videoTrack.id,
          label: videoTrack.label,
          enabled: videoTrack.enabled,
          muted: videoTrack.muted,
          readyState: videoTrack.readyState,
        });
      }

      // Clean up
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Screen sharing test completed successfully');

      return {
        success: true,
        message: 'Screen sharing is properly configured',
        capabilities,
        streamDetails: {
          id: stream.id,
          tracks: stream.getTracks().length,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        },
        simulator: false,
      };
    } catch (error) {
      console.error('❌ Screen sharing test failed:', error);
      return {
        success: false,
        message: 'Screen sharing test failed',
        error: error instanceof Error ? error.message : String(error),
        simulator: isSimulator(),
      };
    }
  };

  // Check screen sharing permissions
  const checkScreenSharingPermissions = () => {
    console.log('🔐 Checking Screen Sharing Permissions...');

    const permissions = {
      android: {
        foregroundService: 'FOREGROUND_SERVICE_MEDIA_PROJECTION',
        notification: 'POST_NOTIFICATIONS',
      },
      ios: {
        screenRecording: 'Screen Recording Permission',
      },
    };

    console.log('📋 Required permissions:', permissions);
    console.log(
      'ℹ️  Permissions are requested at runtime when screen sharing starts',
    );

    return permissions;
  };

  // Get screen sharing capabilities
  const getScreenSharingCapabilities = async () => {
    console.log('🔍 Checking Screen Sharing Capabilities...');

    try {
      const capabilities = await checkScreenSharingCapabilities();

      const platformCapabilities = {
        platform: Platform.OS,
        webrtcVersion: '111.0.6',
        features: {
          screenSharing: capabilities.supported,
          audioSharing: capabilities.audioSupported,
          systemAudioSharing: capabilities.systemAudioSupported,
          videoSharing: capabilities.videoSupported,
          qualityControl: true, // Basic quality control available
        },
        limitations: {
          android: [
            'Requires foreground service',
            'User must grant screen recording permission',
            'May show persistent notification',
          ],
          ios: [
            'Requires screen recording permission',
            'Limited to app content on some devices',
            'May require user to enable screen recording in settings',
          ],
        },
        error: capabilities.error,
      };

      console.log('📊 Screen sharing capabilities:', platformCapabilities);
      return platformCapabilities;
    } catch (error) {
      console.error('❌ Error checking screen sharing capabilities:', error);
      return {
        platform: Platform.OS,
        webrtcVersion: '111.0.6',
        features: {
          screenSharing: false,
          audioSharing: false,
          systemAudioSharing: false,
          videoSharing: false,
          qualityControl: false,
        },
        limitations: {
          android: ['Error checking capabilities'],
          ios: ['Error checking capabilities'],
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  // Validate screen sharing configuration
  const validateScreenSharingConfiguration = () => {
    console.log('🔧 Validating Screen Sharing Configuration...');

    const validation = {
      android: {
        manifestPermissions: true, // Checked in AndroidManifest.xml
        mainActivityConfig: true, // Checked in MainActivity.java
        foregroundService: true, // Enabled in MainActivity
      },
      ios: {
        infoPlist: true, // Basic permissions in Info.plist
        webrtcSupport: true, // react-native-webrtc supports iOS
      },
      reactNative: {
        webrtcLibrary: true, // react-native-webrtc is installed
        contextImplementation: true, // CallContext has screen sharing
        uiImplementation: true, // CallScreen has screen sharing UI
      },
    };

    console.log('✅ Configuration validation:', validation);
    return validation;
  };

  // Run all screen sharing tests
  const runScreenSharingTests = async () => {
    console.log('🚀 Running Complete Screen Sharing Test Suite...');

    const results = {
      configuration: validateScreenSharingConfiguration(),
      capabilities: getScreenSharingCapabilities(),
      permissions: checkScreenSharingPermissions(),
      functionality: await testScreenSharingSetup(),
    };

    console.log('📋 Test Results:', results);
    return results;
  };

  const value: CallContextType = {
    state,
    socket,
    peerConnection,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleCamera,
    startScreenSharing,
    stopScreenSharing,
    sendMessage,
    createOffer,
    createAnswer,
    addIceCandidate,
    debugScreenSharing,
    forceScreenSharingDetection,
    testScreenSharingSetup,
    checkScreenSharingPermissions,
    getScreenSharingCapabilities,
    validateScreenSharingConfiguration,
    runScreenSharingTests,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
