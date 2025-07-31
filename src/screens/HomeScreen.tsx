import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Share,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useCall} from '../contexts/CallContext';
import {requestPermissions} from '../utils/permissions';

const HomeScreen = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [currentFlow, setCurrentFlow] = useState<
    'main' | 'join' | 'create' | 'room'
  >('main');
  const [generatedRoomId, setGeneratedRoomId] = useState('');
  const navigation = useNavigation();
  const {state, joinRoom} = useCall();

  // Navigate to call screen when in call
  useEffect(() => {
    console.log('🏠 HomeScreen: isInCall changed to:', state.isInCall);
    if (state.isInCall) {
      console.log('🏠 HomeScreen: Navigating to Call screen');
      navigation.navigate('Call' as never);
    }
  }, [state.isInCall, navigation]);

  const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim() || !username.trim()) {
      Alert.alert('Error', 'Please enter both room ID and username');
      return;
    }

    if (roomId.trim().length < 3) {
      Alert.alert('Error', 'Room ID must be at least 3 characters');
      return;
    }

    // Request permissions before joining
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      return;
    }

    try {
      await joinRoom(roomId.trim(), username.trim());
      // User will be automatically navigated to call screen when isInCall becomes true
    } catch (error) {
      Alert.alert('Error', 'Failed to join room. Please try again.');
    }
  };

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    // Request permissions before creating
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      return;
    }

    const newRoomId = generateRoomId();
    setGeneratedRoomId(newRoomId);
    setRoomId(newRoomId);

    try {
      await joinRoom(newRoomId, username.trim());
      setCurrentFlow('room');
    } catch (error) {
      Alert.alert('Error', 'Failed to create room. Please try again.');
    }
  };

  const handleShareRoomId = async () => {
    try {
      await Share.share({
        message: `Join my video call room!\n\nRoom ID: ${generatedRoomId}\n\nOpen the Video Calling App and enter this room ID to join.`,
        title: 'Video Call Invitation',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share room ID');
    }
  };

  // Main Screen - Choose Join or Create
  if (currentFlow === 'main') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Video Calling</Text>
            <Text style={styles.subtitle}>Choose an option to get started</Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setCurrentFlow('join')}>
              <Text style={styles.optionIcon}>📞</Text>
              <Text style={styles.optionTitle}>Join a Room</Text>
              <Text style={styles.optionSubtitle}>
                Enter room ID to join existing call
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setCurrentFlow('create')}>
              <Text style={styles.optionIcon}>➕</Text>
              <Text style={styles.optionTitle}>Create a Room</Text>
              <Text style={styles.optionSubtitle}>Start a new video call</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                state.isConnected ? styles.connected : styles.disconnected,
              ]}
            />
            <Text style={styles.statusText}>
              {state.isConnected ? 'Connected to server' : 'Connecting...'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Join Room Screen
  if (currentFlow === 'join') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentFlow('main')}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Join a Room</Text>
              <Text style={styles.subtitle}>Enter room details to join</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Room ID</Text>
                <TextInput
                  style={styles.input}
                  value={roomId}
                  onChangeText={setRoomId}
                  placeholder="Enter room ID"
                  placeholderTextColor="#666"
                  autoCapitalize="characters"
                  maxLength={10}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Your Name</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter your name"
                  placeholderTextColor="#666"
                  maxLength={20}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.joinButton,
                  (!roomId.trim() || !username.trim()) &&
                    styles.joinButtonDisabled,
                ]}
                onPress={handleJoinRoom}
                disabled={!roomId.trim() || !username.trim()}>
                <Text style={styles.joinButtonText}>Join Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Create Room Screen
  if (currentFlow === 'create') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentFlow('main')}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Create a Room</Text>
              <Text style={styles.subtitle}>Start a new video call</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Your Name</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter your name"
                  placeholderTextColor="#666"
                  maxLength={20}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  !username.trim() && styles.createButtonDisabled,
                ]}
                onPress={handleCreateRoom}
                disabled={!username.trim()}>
                <Text style={styles.createButtonText}>Create Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Room Created Screen
  if (currentFlow === 'room') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Room Created!</Text>
            <Text style={styles.subtitle}>Share the room ID with others</Text>
          </View>

          <View style={styles.roomInfoContainer}>
            <Text style={styles.roomIdLabel}>Room ID</Text>
            <View style={styles.roomIdContainer}>
              <Text style={styles.roomIdText}>{generatedRoomId}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  // Copy to clipboard functionality would go here
                  Alert.alert('Copied!', 'Room ID copied to clipboard');
                }}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.shareContainer}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareRoomId}>
              <Text style={styles.shareButtonText}>📤 Share Room ID</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.creatorControls}>
            <TouchableOpacity
              style={styles.startCallButton}
              onPress={() => navigation.navigate('Call' as never)}>
              <Text style={styles.startCallButtonText}>Start Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 48,
  },
  optionButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  optionSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginBottom: 48,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  input: {
    height: 56,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#007AFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  joinButtonDisabled: {
    backgroundColor: '#3A3A3C',
    shadowOpacity: 0,
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#34C759',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#34C759',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonDisabled: {
    backgroundColor: '#3A3A3C',
    shadowOpacity: 0,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  connected: {
    backgroundColor: '#34C759',
  },
  disconnected: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  pending: {
    backgroundColor: '#FF9500',
  },
  creatorControls: {
    alignItems: 'center',
    marginBottom: 24,
  },
  startCallButton: {
    backgroundColor: '#34C759',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#34C759',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startCallButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  roomInfoContainer: {
    marginBottom: 48,
  },
  roomIdLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  roomIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  roomIdText: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  shareButton: {
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#007AFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    width: '85%',
    maxHeight: '70%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  requestsList: {
    flex: 1,
  },
});

export default HomeScreen;
