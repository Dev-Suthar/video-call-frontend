import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import {RTCView} from 'react-native-webrtc';
import {useNavigation} from '@react-navigation/native';
import {useCall} from '../contexts/CallContext';
import Icon from '../components/Icon';
import ConnectionQualityIndicator from '../components/ConnectionQualityIndicator';
import ErrorDisplay from '../components/ErrorDisplay';
import CallDuration from '../components/CallDuration';
import LoadingSpinner from '../components/LoadingSpinner';
import {hapticMedium, hapticError} from '../utils/haptics';

const {width, height} = Dimensions.get('window');

const CallScreen = () => {
  const [showChat, setShowChat] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isLocalVideoLarge, setIsLocalVideoLarge] = useState(false);
  const [isVideoSwitching, setIsVideoSwitching] = useState(false);
  const [isStreamsReady, setIsStreamsReady] = useState(false);
  const [forceVideoUpdate, setForceVideoUpdate] = useState(0);
  const navigation = useNavigation();
  const {
    state,
    socket,
    leaveRoom,
    toggleMute,
    toggleCamera,
    startScreenSharing,
    stopScreenSharing,
    sendMessage,
  } = useCall();

  // Animation values
  const fadeAnim = new Animated.Value(1);

  useEffect(() => {
    console.log('📱 CallScreen mounted');
    console.log('Initial state:', {
      isInCall: state.isInCall,
      hasLocalStream: !!state.localStream,
      hasRemoteStream: !!state.remoteStream,
      participantsCount: state.participants.length,
    });
    return () => {
      console.log('📱 CallScreen unmounting');
    };
  }, []);

  useEffect(() => {
    console.log('CallScreen: isInCall changed to:', state.isInCall);
    if (!state.isInCall) {
      console.log(
        'CallScreen: Navigating to HomeScreen due to isInCall = false',
      );
      navigation.navigate('Home' as never);
    }
  }, [state.isInCall, navigation]);

  // Effect to force video update when streams become available
  useEffect(() => {
    if (state.localStream && state.localStream.getTracks().length > 0) {
      // Add a small delay to ensure the stream is fully initialized
      const timer = setTimeout(() => {
        setForceVideoUpdate(prev => prev + 1);
        console.log('Forcing video update - local stream ready');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.localStream]);

  // Additional effect to handle initial stream setup
  useEffect(() => {
    if (state.isInCall && state.localStream) {
      // Force update immediately when entering call with local stream
      setForceVideoUpdate(prev => prev + 1);
      console.log(
        'Forcing initial video update - entering call with local stream',
      );
    }
  }, [state.isInCall, state.localStream]);

  // Debug effect to monitor stream changes
  useEffect(() => {
    console.log('Stream state changed:', {
      hasLocalStream: !!state.localStream,
      hasRemoteStream: !!state.remoteStream,
      localStreamTracks: state.localStream?.getTracks().length || 0,
      remoteStreamTracks: state.remoteStream?.getTracks().length || 0,
    });

    // Check if streams are ready
    const localStreamReady =
      !!state.localStream && state.localStream.getTracks().length > 0;
    const remoteStreamReady =
      !!state.remoteStream && state.remoteStream.getTracks().length > 0;

    // Set streams ready if we have local stream (for small thumbnail) or any stream
    if (localStreamReady || remoteStreamReady) {
      setIsStreamsReady(true);
    }

    // Also set ready if we're in call and have local stream (for immediate display)
    if (state.isInCall && localStreamReady) {
      setIsStreamsReady(true);
      // Force video update when streams become available
      setForceVideoUpdate(prev => prev + 1);
    }
  }, [state.localStream, state.remoteStream]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isControlsVisible) {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
        setIsControlsVisible(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isControlsVisible]);

  const showControls = () => {
    setIsControlsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleEndCall = () => {
    hapticMedium();
    Alert.alert('End Call', 'Are you sure you want to end the call?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'End Call',
        style: 'destructive',
        onPress: () => {
          hapticError();
          leaveRoom();
          navigation.navigate('Home' as never);
        },
      },
    ]);
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendMessage(chatMessage.trim());
      setChatMessage('');
    }
  };

  const toggleVideoView = () => {
    setIsVideoSwitching(true);
    // Add a small delay to ensure smooth transition
    setTimeout(() => {
      setIsLocalVideoLarge(!isLocalVideoLarge);
      setIsVideoSwitching(false);
    }, 100);
  };

  const renderChatMessage = ({item}: {item: any}) => {
    const isOwnMessage = item.userId === socket?.id;
    const isOwnMessageByUsername = item.username === state.username;
    const shouldAlignRight = isOwnMessage || isOwnMessageByUsername;

    return (
      <Animated.View
        style={[
          styles.chatMessage,
          shouldAlignRight ? styles.ownMessage : styles.otherMessage,
        ]}>
        <Text style={styles.messageUsername}>{item.username}</Text>
        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </Animated.View>
    );
  };

  const unreadCount = state.messages.length;

  // Check if we have any video streams
  const hasAnyVideo = state.localStream || state.remoteStream;
  const hasLocalVideo =
    !!state.localStream && state.localStream.getTracks().length > 0;
  const hasRemoteVideo =
    !!state.remoteStream && state.remoteStream.getTracks().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Main Video Container */}
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={showControls}>
        {/* Large Video View */}
        {isLocalVideoLarge ? (
          // Local video as main view
          hasLocalVideo && state.localStream ? (
            <RTCView
              key={`main-local-video-${forceVideoUpdate}`}
              streamURL={state.localStream.toURL()}
              style={styles.mainVideo}
              objectFit="cover"
              mirror={true}
            />
          ) : (
            <View style={styles.mainVideoPlaceholder}>
              <Text style={styles.mainVideoPlaceholderText}>Local Camera</Text>
            </View>
          )
        ) : // Remote video as main view
        hasRemoteVideo && state.remoteStream ? (
          <RTCView
            key={`main-remote-video-${forceVideoUpdate}`}
            streamURL={state.remoteStream.toURL()}
            style={styles.mainVideo}
            objectFit="cover"
            mirror={false}
          />
        ) : (
          <View style={styles.mainVideoPlaceholder}>
            <Text style={styles.mainVideoPlaceholderText}>Remote Camera</Text>
          </View>
        )}

        {/* Screen Share Video */}
        {state.screenSharingUser && state.screenStream && (
          <RTCView
            streamURL={state.screenStream.toURL()}
            style={styles.screenVideo}
            objectFit="contain"
          />
        )}

        {/* Screen Sharing Indicator */}
        {state.screenSharingUser && !state.screenStream && (
          <Animated.View style={styles.screenShareIndicator}>
            <Icon name="screen-share" size={16} color="#ffffff" />
            <Text style={styles.screenShareText}>
              {state.screenSharingUser === socket?.id
                ? 'You are sharing screen'
                : 'Screen sharing active'}
            </Text>
          </Animated.View>
        )}

        {/* Connection Quality Indicator */}
        {state.isInCall && (
          <View style={styles.connectionQualityContainer}>
            <ConnectionQualityIndicator quality={state.connectionQuality} />
          </View>
        )}

        {/* Call Duration */}
        {state.isInCall && state.callDuration > 0 && (
          <CallDuration duration={state.callDuration} />
        )}

        {/* Error Display */}
        <ErrorDisplay
          error={state.errorMessage}
          onRetry={() => {
            // Handle retry logic
          }}
          onDismiss={() => {
            // Handle dismiss logic
          }}
        />

        {/* Loading State - when no video streams are available */}
        {!hasAnyVideo && <LoadingSpinner />}

        {/* Small Video Loading State */}
        {hasAnyVideo && !isStreamsReady && (
          <View style={styles.smallVideoContainer}>
            <View style={styles.smallVideoPlaceholder}>
              <LoadingSpinner />
              <Text style={styles.smallVideoPlaceholderText}>
                Initializing...
              </Text>
            </View>
          </View>
        )}

        {/* Small Video Thumbnail */}
        {hasAnyVideo && (
          <TouchableOpacity
            style={[
              styles.smallVideoContainer,
              isVideoSwitching && styles.smallVideoContainerSwitching,
            ]}
            onPress={toggleVideoView}
            activeOpacity={0.8}
            disabled={isVideoSwitching}>
            {isLocalVideoLarge ? (
              // Show remote video as thumbnail
              hasRemoteVideo && state.remoteStream ? (
                <RTCView
                  key={`small-remote-video-${forceVideoUpdate}`}
                  streamURL={state.remoteStream.toURL()}
                  style={styles.smallVideo}
                  objectFit="cover"
                  mirror={false}
                />
              ) : (
                <View style={styles.smallVideoPlaceholder}>
                  <Text style={styles.smallVideoPlaceholderText}>Remote</Text>
                </View>
              )
            ) : // Show local video as thumbnail
            hasLocalVideo && state.localStream ? (
              <RTCView
                key={`small-local-video-${forceVideoUpdate}`}
                streamURL={state.localStream.toURL()}
                style={styles.smallVideo}
                objectFit="cover"
                mirror={true}
              />
            ) : (
              <View style={styles.smallVideoPlaceholder}>
                <Text style={styles.smallVideoPlaceholderText}>You</Text>
              </View>
            )}
            <View style={styles.smallVideoOverlay}>
              <View style={styles.smallVideoLabel}>
                <Text style={styles.smallVideoLabelText}>
                  {isLocalVideoLarge ? 'Remote' : 'You'}
                </Text>
              </View>
              {!isLocalVideoLarge && state.isMuted && (
                <View style={styles.muteIndicator}>
                  <Icon name="mic-off" size={12} color="#ffffff" />
                </View>
              )}
              {isVideoSwitching && (
                <View style={styles.switchingIndicator}>
                  <Text style={styles.switchingIndicatorText}>
                    Switching...
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Control Bar */}
      <Animated.View
        style={[
          styles.controlBar,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            state.isMuted && styles.controlButtonActive,
          ]}
          onPress={toggleMute}>
          <View style={styles.controlButtonInner}>
            <Icon
              name={state.isMuted ? 'mic-off' : 'mic'}
              size={20}
              color="#ffffff"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            state.isCameraOff && styles.controlButtonActive,
          ]}
          onPress={toggleCamera}>
          <View style={styles.controlButtonInner}>
            <Icon
              name={state.isCameraOff ? 'videocam-off' : 'videocam'}
              size={20}
              color="#ffffff"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.chatButton]}
          onPress={() => setShowChat(!showChat)}>
          <View style={styles.controlButtonInner}>
            <Icon name="chat" size={20} color="#ffffff" />
            {unreadCount > 0 && (
              <View style={styles.messageBadge}>
                <Text style={styles.messageBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            state.isScreenSharing && styles.controlButtonActive,
          ]}
          onPress={
            state.isScreenSharing ? stopScreenSharing : startScreenSharing
          }>
          <View style={styles.controlButtonInner}>
            <Icon
              name={state.isScreenSharing ? 'screen-share' : 'cast'}
              size={20}
              color="#ffffff"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.detailsButton]}
          onPress={() => setShowDetails(true)}>
          <View style={styles.controlButtonInner}>
            <Icon name="info" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}>
          <View style={styles.controlButtonInner}>
            <Icon name="call-end" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailsContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetails(false)}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Call Details</Text>
              <View style={styles.modalHeaderRight} />
            </View>

            <View style={styles.detailsContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Room Information</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Room ID:</Text>
                  <Text style={styles.detailValue}>{state.roomId}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Participants:</Text>
                  <Text style={styles.detailValue}>
                    {state.participants.length}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Participants</Text>
                {state.participants.map(participant => (
                  <View
                    key={participant.userId}
                    style={styles.participantDetail}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantAvatarText}>
                        {participant.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>
                        {participant.username}
                      </Text>
                      {participant.isCreator && (
                        <Text style={styles.creatorBadge}>Creator</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Call Status</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Microphone:</Text>
                  <Text style={styles.detailValue}>
                    {state.isMuted ? 'Muted' : 'Active'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Camera:</Text>
                  <Text style={styles.detailValue}>
                    {state.isCameraOff ? 'Off' : 'On'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Screen Sharing:</Text>
                  <Text style={styles.detailValue}>
                    {state.isScreenSharing ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Local Stream:</Text>
                  <Text style={styles.detailValue}>
                    {hasLocalVideo ? 'Connected' : 'Not Available'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Remote Stream:</Text>
                  <Text style={styles.detailValue}>
                    {hasRemoteVideo ? 'Connected' : 'Not Available'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal
        visible={showChat}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChat(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatModal}>
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowChat(false)}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.chatTitle}>Chat</Text>
              <View style={styles.chatHeaderRight} />
            </View>

            <FlatList
              data={state.messages}
              renderItem={renderChatMessage}
              keyExtractor={item => item.id}
              style={styles.chatMessages}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />

            <View style={styles.chatInputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.chatInput}
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  placeholder="Type a message..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !chatMessage.trim() && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendMessage}
                  disabled={!chatMessage.trim()}>
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  mainVideo: {
    width: '100%',
    height: '100%',
  },
  mainVideoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainVideoPlaceholderText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  screenVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingSubtitle: {
    color: '#cccccc',
    fontSize: 16,
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  loadingDotActive: {
    backgroundColor: '#00CED1',
    shadowColor: '#00CED1',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  debugInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  debugText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 4,
  },
  smallVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  smallVideoContainerSwitching: {
    borderColor: '#00CED1',
    shadowColor: '#00CED1',
    shadowOpacity: 0.5,
  },
  smallVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  smallVideoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallVideoPlaceholderText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  switchingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchingIndicatorText: {
    color: '#00CED1',
    fontSize: 12,
    fontWeight: '600',
  },
  smallVideoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  smallVideoLabel: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  smallVideoLabelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  muteIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteIcon: {
    fontSize: 12,
  },
  connectionContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -50}, {translateY: -50}],
  },
  connectionIndicator: {
    alignItems: 'center',
  },
  connectionDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  connectionDotActive: {
    backgroundColor: '#00CED1',
    shadowColor: '#00CED1',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  connectionLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
  },
  screenShareIndicator: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FFA500',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  screenShareIcon: {
    marginRight: 8,
  },
  screenShareIconText: {
    fontSize: 16,
  },
  screenShareText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#FF5722',
  },
  controlButtonIcon: {
    fontSize: 20,
  },
  chatButton: {
    backgroundColor: '#007AFF',
  },
  detailsButton: {
    backgroundColor: '#34C759',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
  },
  messageBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  messageBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    backgroundColor: '#1C1C1E',
    width: width * 0.9,
    maxHeight: height * 0.8,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalHeaderRight: {
    width: 40,
  },
  detailsContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  detailLabel: {
    color: '#cccccc',
    fontSize: 14,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  participantDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  creatorBadge: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  chatModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: '#1C1C1E',
    height: height * 0.7,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  chatTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatHeaderRight: {
    width: 40,
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 20,
  },
  chatMessage: {
    marginVertical: 8,
    padding: 16,
    borderRadius: 20,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#2C2C2E',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageUsername: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    color: '#cccccc',
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  chatInputContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#2C2C2E',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    marginRight: 10,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#8E8E93',
    shadowOpacity: 0,
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  connectionQualityContainer: {
    position: 'absolute',
    top: 100, // Adjust position as needed
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default CallScreen;
