# Video Calling App

A React Native application for video calling with WebRTC technology.

## Features

- Real-time video calling
- Screen sharing
- Chat functionality
- Participant management
- Cross-platform (iOS & Android)

## Prerequisites

- Node.js (>=16)
- React Native CLI
- iOS: Xcode (for iOS development)
- Android: Android Studio (for Android development)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Video-call-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. iOS setup (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

## Environment Setup

This project uses environment variables for configuration. See [ENV_SETUP.md](./ENV_SETUP.md) for detailed information.

### Quick Setup

**For Local Development:**
```bash
npm run android:local
# or
npm run ios:local
```
*Automatically uses local server: `http://192.168.29.30:3000`*

**For Production:**
```bash
npm run android:live
# or
npm run ios:live
```
*Automatically uses live server: `https://video-call-backend-uifd.onrender.com`*

## Running the App

### Development Server
```bash
npm start
```

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

## Project Structure

```
src/
├── contexts/          # React contexts
│   └── CallContext.tsx
├── screens/           # App screens
│   ├── HomeScreen.tsx
│   └── CallScreen.tsx
└── utils/             # Utility functions
    ├── permissions.ts
    ├── socket.ts
    └── webrtc.ts
```

## Configuration

The app can be configured through environment variables:

- `SOCKET_SERVER_URL`: WebSocket server for signaling
- `WEBRTC_STUN_SERVERS`: STUN servers for WebRTC
- `DEBUG`: Enable/disable debug mode
- Feature flags for enabling/disabling features

## Development

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Troubleshooting

1. **Socket Connection Issues**: Check your `SOCKET_SERVER_URL` in the environment file
2. **WebRTC Issues**: Ensure STUN servers are properly configured
3. **Permissions**: Make sure camera and microphone permissions are granted

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license here] 