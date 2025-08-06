import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import {Platform} from 'react-native';
import {CONFIG} from '../config/config';

export const createPeerConnection = (): RTCPeerConnection => {
  const stunServers = CONFIG.WEBRTC_STUN_SERVERS
    ? CONFIG.WEBRTC_STUN_SERVERS.split(',').map((url: string) => ({
        urls: url.trim(),
      }))
    : [
        {urls: 'stun:stun.l.google.com:19302'},
        {urls: 'stun:stun1.l.google.com:19302'},
        {urls: 'stun:stun2.l.google.com:19302'},
      ];

  return new RTCPeerConnection({
    iceServers: stunServers,
    iceCandidatePoolSize: 10,
  });
};

export const getUserMedia = async (): Promise<MediaStream> => {
  try {
    return await mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: 'user',
      },
    });
  } catch (error) {
    console.error('Error getting user media:', error);
    throw error;
  }
};

// Enhanced screen sharing implementation using Screen Capture API
export const getDisplayMedia = async (options?: {
  video?: boolean;
  audio?: boolean;
  surfaceSwitching?: 'include' | 'exclude';
  systemAudio?: 'include' | 'exclude';
  selfBrowserSurface?: 'include' | 'exclude';
  monitorTypeSurfaces?: 'include' | 'exclude';
}): Promise<MediaStream> => {
  try {
    console.log('🎬 Starting screen capture with options:', options);

    // Platform-specific configurations
    const displayMediaOptions = {
      video: {
        width: {ideal: 1920, max: 1920},
        height: {ideal: 1080, max: 1080},
        frameRate: {ideal: 30, max: 60},
        aspectRatio: {ideal: 16 / 9},
        // Screen capture specific options
        displaySurface: 'monitor' as const, // 'monitor', 'window', 'application', 'browser'
        logicalSurface: true,
        cursor: 'always' as const, // 'always', 'motion', 'never'
        restrictOwnAudio: false,
        suppressLocalAudioPlayback: false,
      },
      audio: options?.audio !== false, // Include audio by default
      // Advanced screen capture options
      surfaceSwitching: options?.surfaceSwitching || 'include',
      systemAudio: options?.systemAudio || 'exclude',
      selfBrowserSurface: options?.selfBrowserSurface || 'exclude',
      monitorTypeSurfaces: options?.monitorTypeSurfaces || 'include',
    };

    console.log('📱 Platform:', Platform.OS);
    console.log('🎬 Display media options:', displayMediaOptions);

    const stream = await mediaDevices.getDisplayMedia(displayMediaOptions);

    console.log('✅ Screen capture stream obtained:', {
      id: stream.id,
      tracks: stream.getTracks().length,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
    });

    // Log track details for debugging
    stream.getTracks().forEach((track, index) => {
      console.log(`Track ${index}:`, {
        kind: track.kind,
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      });
    });

    return stream;
  } catch (error) {
    console.error('❌ Error getting display media:', error);

    // Provide user-friendly error messages
    let errorMessage = 'Failed to start screen sharing';

    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        errorMessage =
          'Screen sharing permission denied. Please allow screen recording access.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage =
          'Screen sharing is not supported on this device or browser.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Unable to access screen content. Please try again.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage =
          'Screen sharing constraints not met. Please try with different settings.';
      } else if (error.name === 'TypeError') {
        errorMessage =
          'Screen sharing API not available. Please check your device compatibility.';
      } else {
        errorMessage = `Screen sharing error: ${error.message}`;
      }
    }

    console.error('User-friendly error message:', errorMessage);
    throw new Error(errorMessage);
  }
};

// Enhanced function to check screen sharing capabilities
export const checkScreenSharingCapabilities = async (): Promise<{
  supported: boolean;
  audioSupported: boolean;
  videoSupported: boolean;
  systemAudioSupported: boolean;
  error?: string;
}> => {
  try {
    console.log('🔍 Checking screen sharing capabilities...');

    // Check if getDisplayMedia is available
    if (!mediaDevices.getDisplayMedia) {
      return {
        supported: false,
        audioSupported: false,
        videoSupported: false,
        systemAudioSupported: false,
        error: 'getDisplayMedia API not available',
      };
    }

    // Try to get display media with minimal constraints to test availability
    const testStream = await mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    const videoTracks = testStream.getVideoTracks();
    const audioTracks = testStream.getAudioTracks();

    // Stop the test stream immediately
    testStream.getTracks().forEach(track => track.stop());

    return {
      supported: true,
      audioSupported: audioTracks.length > 0,
      videoSupported: videoTracks.length > 0,
      systemAudioSupported: Platform.OS === 'android', // System audio more common on Android
    };
  } catch (error) {
    console.error('❌ Screen sharing capability check failed:', error);
    return {
      supported: false,
      audioSupported: false,
      videoSupported: false,
      systemAudioSupported: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Function to create screen sharing stream with specific constraints
export const createScreenSharingStream = async (options?: {
  includeAudio?: boolean;
  includeSystemAudio?: boolean;
  quality?: 'low' | 'medium' | 'high';
  frameRate?: number;
}): Promise<MediaStream> => {
  const quality = options?.quality || 'medium';
  const frameRate = options?.frameRate || 30;

  const qualitySettings = {
    low: {width: 1280, height: 720, frameRate: 15},
    medium: {width: 1920, height: 1080, frameRate: 30},
    high: {width: 2560, height: 1440, frameRate: 60},
  };

  const settings = qualitySettings[quality];

  const displayOptions = {
    video: {
      width: {ideal: settings.width, max: settings.width},
      height: {ideal: settings.height, max: settings.height},
      frameRate: {ideal: frameRate, max: frameRate},
      displaySurface: 'monitor' as const,
      logicalSurface: true,
      cursor: 'always' as const,
    },
    audio: options?.includeAudio || false,
    systemAudio: options?.includeSystemAudio ? 'include' : 'exclude',
  };

  console.log(
    '🎬 Creating screen sharing stream with options:',
    displayOptions,
  );

  return await getDisplayMedia(displayOptions);
};

export const addTracksToPeerConnection = (
  peerConnection: RTCPeerConnection,
  stream: MediaStream,
): void => {
  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream);
  });
};

export const createOffer = async (
  peerConnection: RTCPeerConnection,
): Promise<RTCSessionDescription> => {
  try {
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peerConnection.setLocalDescription(offer);
    return offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
};

export const createAnswer = async (
  peerConnection: RTCPeerConnection,
): Promise<RTCSessionDescription> => {
  try {
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  } catch (error) {
    console.error('Error creating answer:', error);
    throw error;
  }
};

export const setRemoteDescription = async (
  peerConnection: RTCPeerConnection,
  description: RTCSessionDescription,
): Promise<void> => {
  try {
    await peerConnection.setRemoteDescription(description);
  } catch (error) {
    console.error('Error setting remote description:', error);
    throw error;
  }
};

export const addIceCandidate = async (
  peerConnection: RTCPeerConnection,
  candidate: RTCIceCandidate,
): Promise<void> => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
    throw error;
  }
};

export const closePeerConnection = (
  peerConnection: RTCPeerConnection,
): void => {
  if (peerConnection) {
    peerConnection.close();
  }
};

export const stopStream = (stream: MediaStream | null): void => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

// Enhanced function to replace video tracks for screen sharing
export const replaceVideoTrack = (
  peerConnection: RTCPeerConnection,
  newStream: MediaStream,
  oldStream?: MediaStream | null,
): void => {
  try {
    console.log('🔄 Replacing video tracks for screen sharing');

    // Remove old video tracks
    const senders = peerConnection.getSenders();
    const videoSenders = senders.filter(
      sender => sender.track && sender.track.kind === 'video',
    );

    console.log('Found video senders to replace:', videoSenders.length);

    // Remove old video tracks
    videoSenders.forEach(sender => {
      try {
        peerConnection.removeTrack(sender);
        console.log('Removed old video track:', sender.track?.id);
      } catch (error) {
        console.error('Error removing old video track:', error);
      }
    });

    // Add new video tracks
    const videoTracks = newStream.getVideoTracks();
    videoTracks.forEach(track => {
      try {
        peerConnection.addTrack(track, newStream);
        console.log('Added new video track:', track.id);
      } catch (error) {
        console.error('Error adding new video track:', error);
      }
    });

    console.log('✅ Video track replacement completed');
  } catch (error) {
    console.error('❌ Error replacing video tracks:', error);
    throw error;
  }
};

// Function to restore camera video track
export const restoreCameraTrack = (
  peerConnection: RTCPeerConnection,
  cameraStream: MediaStream,
): void => {
  try {
    console.log('🔄 Restoring camera video track');

    // Remove screen sharing video tracks
    const senders = peerConnection.getSenders();
    const videoSenders = senders.filter(
      sender => sender.track && sender.track.kind === 'video',
    );

    console.log('Found video senders to replace:', videoSenders.length);

    // Remove screen sharing video tracks
    videoSenders.forEach(sender => {
      try {
        peerConnection.removeTrack(sender);
        console.log('Removed screen sharing video track:', sender.track?.id);
      } catch (error) {
        console.error('Error removing screen sharing video track:', error);
      }
    });

    // Add camera video track back
    const cameraVideoTrack = cameraStream.getVideoTracks()[0];
    if (cameraVideoTrack) {
      try {
        peerConnection.addTrack(cameraVideoTrack, cameraStream);
        console.log('Restored camera video track:', cameraVideoTrack.id);
      } catch (error) {
        console.error('Error restoring camera video track:', error);
      }
    } else {
      console.warn('No camera video track found in camera stream');
    }

    console.log('✅ Camera track restoration completed');
  } catch (error) {
    console.error('❌ Error restoring camera track:', error);
    throw error;
  }
};
