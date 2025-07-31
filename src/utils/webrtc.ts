import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

export const createPeerConnection = (): RTCPeerConnection => {
  return new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
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

export const getDisplayMedia = async (): Promise<MediaStream> => {
  try {
    return await mediaDevices.getDisplayMedia({
      video: {
        width: 1920,
        height: 1080,
        frameRate: 30,
      },
    });
  } catch (error) {
    console.error('Error getting display media:', error);
    throw error;
  }
};

export const addTracksToPeerConnection = (
  peerConnection: RTCPeerConnection,
  stream: MediaStream
): void => {
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });
};

export const createOffer = async (peerConnection: RTCPeerConnection): Promise<RTCSessionDescription> => {
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

export const createAnswer = async (peerConnection: RTCPeerConnection): Promise<RTCSessionDescription> => {
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
  description: RTCSessionDescription
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
  candidate: RTCIceCandidate
): Promise<void> => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
    throw error;
  }
};

export const closePeerConnection = (peerConnection: RTCPeerConnection): void => {
  if (peerConnection) {
    peerConnection.close();
  }
};

export const stopStream = (stream: MediaStream | null): void => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
};