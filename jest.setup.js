import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => { };
    return Reanimated;
});

jest.mock('react-native-webrtc', () => ({
    RTCPeerConnection: jest.fn(),
    RTCIceCandidate: jest.fn(),
    RTCSessionDescription: jest.fn(),
    mediaDevices: {
        getUserMedia: jest.fn(),
        getDisplayMedia: jest.fn(),
    },
    RTCView: 'RTCView',
}));

jest.mock('socket.io-client', () => ({
    io: jest.fn(() => ({
        on: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
    })),
}));

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
    }),
}));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');