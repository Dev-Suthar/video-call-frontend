import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from 'react';
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
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
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

        // When a new user joins, create an offer if we're already in the room
        // and we have a peer connection and local stream
        if (
          stateRef.current.isInCall &&
          peerConnectionRef.current &&
          stateRef.current.localStream &&
          data.userId !== newSocket.id
        ) {
          console.log('Creating offer for new user:', data.userId);
          // Add a small delay to ensure everything is set up
          setTimeout(() => {
            createOffer();
          }, 1000);
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
        // Handle user leaving
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
        dispatch({type: 'SET_SCREEN_SHARING_USER', payload: data.userId});
      });

      newSocket.on('screen-share-stop', data => {
        dispatch({type: 'SET_SCREEN_SHARING_USER', payload: null});
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
      dispatch({type: 'SET_ROOM_ID', payload: roomId});
      dispatch({type: 'SET_USERNAME', payload: username});

      socket.emit('join-room', {roomId, username});

      // Get local media stream
      try {
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
        const iceServers = [
          {urls: 'stun:stun.l.google.com:19302'},
          {urls: 'stun:stun1.l.google.com:19302'},
        ];

        const pc = new RTCPeerConnection({
          iceServers: iceServers,
        });
        console.log('Peer connection created with ICE servers:', iceServers);

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
          );
          if (event.streams && event.streams[0]) {
            dispatch({type: 'SET_REMOTE_STREAM', payload: event.streams[0]});
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
        console.error('Error getting user media:', error);
      }
    } else {
      console.log('Cannot join room - socket not connected');
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
      const stream = await mediaDevices.getDisplayMedia({
        video: true,
      });
      dispatch({type: 'SET_SCREEN_STREAM', payload: stream});
      dispatch({type: 'SET_SCREEN_SHARING', payload: true});

      if (socket) {
        socket.emit('screen-share-start');
      }
    } catch (error) {
      console.error('Error starting screen sharing:', error);
    }
  };

  const stopScreenSharing = () => {
    if (state.screenStream) {
      state.screenStream.getTracks().forEach(track => track.stop());
      dispatch({type: 'SET_SCREEN_STREAM', payload: null});
      dispatch({type: 'SET_SCREEN_SHARING', payload: false});

      if (socket) {
        socket.emit('screen-share-stop');
      }
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

    if (peerConnectionRef.current && stateRef.current.localStream) {
      try {
        const offer = await peerConnectionRef.current.createOffer();
        console.log('Offer created successfully');
        await peerConnectionRef.current.setLocalDescription(offer);
        console.log('Local description set');

        if (socketRef.current) {
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
        console.error('Error creating offer:', error);
      }
    } else {
      console.log(
        'Cannot create offer - missing peer connection or local stream',
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
        console.error('Error creating answer:', error);
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
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
