# Video Calling App

A React Native video calling application with WebRTC support, featuring enhanced screen sharing capabilities.

## Features

- **Real-time Video Calling**: High-quality video calls using WebRTC
- **Enhanced Screen Sharing**: Advanced screen capture with quality controls
- **Chat Functionality**: In-call text messaging
- **Connection Quality Monitoring**: Real-time connection status
- **Cross-platform Support**: iOS and Android
- **Modern UI/UX**: Beautiful, intuitive interface

## Enhanced Screen Sharing Implementation

This app implements advanced screen sharing using the **Screen Capture API** from `react-native-webrtc` version 111.0.6.

### Key Features

#### 🎬 Advanced Screen Capture
- **Quality Control**: Low, Medium, High quality settings
- **Frame Rate Control**: Configurable from 15-60 FPS
- **Resolution Options**: Up to 2560x1440 support
- **Audio Support**: Optional system audio capture
- **Platform Optimization**: iOS and Android specific configurations

#### 🔧 Technical Implementation

```typescript
// Enhanced screen sharing with quality controls
const stream = await createScreenSharingStream({
  includeAudio: false,
  quality: 'medium',
  frameRate: 30,
});
```

#### 📱 Platform Support

**Android:**
- Full screen capture support
- System audio capture capability
- Foreground service integration
- Permission handling

**iOS:**
- Screen recording permission handling
- App content capture
- Limited system audio support

#### 🛠️ Error Handling

Comprehensive error handling with user-friendly messages:

- `NotAllowedError`: Permission denied
- `NotSupportedError`: Device not supported
- `NotReadableError`: Content access issues
- `OverconstrainedError`: Constraint conflicts
- `TypeError`: API availability issues

### Usage

#### Starting Screen Sharing

```typescript
// Basic screen sharing
await startScreenSharing();

// With quality options
const stream = await createScreenSharingStream({
  quality: 'high',
  includeAudio: true,
  frameRate: 60,
});
```

#### Stopping Screen Sharing

```typescript
// Automatically restores camera
stopScreenSharing();
```

#### Testing Capabilities

```typescript
// Check device capabilities
const capabilities = await checkScreenSharingCapabilities();

// Run comprehensive tests
const results = await runScreenSharingTests();
```

### Configuration

#### Quality Settings

```typescript
const qualitySettings = {
  low: { width: 1280, height: 720, frameRate: 15 },
  medium: { width: 1920, height: 1080, frameRate: 30 },
  high: { width: 2560, height: 1440, frameRate: 60 },
};
```

#### Advanced Options

```typescript
const displayOptions = {
  video: {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
    displaySurface: 'monitor', // 'monitor', 'window', 'application'
    logicalSurface: true,
    cursor: 'always', // 'always', 'motion', 'never'
  },
  audio: true,
  systemAudio: 'include', // 'include', 'exclude'
};
```

### Debugging

#### Console Logging

The implementation includes comprehensive logging:

```typescript
console.log('🎬 Starting screen capture with options:', options);
console.log('✅ Screen capture stream obtained:', streamDetails);
console.log('🔄 Replacing video tracks for screen sharing');
console.log('✅ Video track replacement completed');
```

#### Test Functions

```typescript
// Debug current state
debugScreenSharing();

// Force detection
forceScreenSharingDetection();

// Run tests
testScreenSharingSetup();
```

### Permissions

#### Android Permissions

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

#### iOS Permissions

```xml
<!-- Info.plist -->
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for video calls</string>
<key>NSCameraUsageDescription</key>
<string>This app needs camera access for video calls</string>
```

### Troubleshooting

#### Common Issues

1. **Permission Denied**
   - Ensure screen recording permission is granted
   - Check device settings for app permissions

2. **Blank Screen**
   - Verify screen sharing is supported on device
   - Check if running on simulator (limited support)

3. **Audio Issues**
   - System audio capture may not work on all devices
   - Check platform-specific limitations

4. **Performance Issues**
   - Lower quality settings for better performance
   - Reduce frame rate on older devices

#### Debug Commands

```typescript
// Check capabilities
const caps = await checkScreenSharingCapabilities();
console.log('Capabilities:', caps);

// Test functionality
const test = await testScreenSharingSetup();
console.log('Test results:', test);

// Validate configuration
const config = validateScreenSharingConfiguration();
console.log('Configuration:', config);
```

## Installation

```bash
# Install dependencies
npm install

# iOS
cd ios && pod install && cd ..

# Run the app
npm run android  # or npm run ios
```

## Environment Setup

```bash
# Set environment
npm run env:local    # for local development
npm run env:live     # for production

# Start with environment
npm run android:local
npm run ios:live
```

## Development

```bash
# Start Metro bundler
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## Architecture

- **CallContext**: Central state management for video calls
- **WebRTC Utils**: Enhanced screen sharing utilities
- **CallScreen**: Main video calling interface
- **Components**: Reusable UI components

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 