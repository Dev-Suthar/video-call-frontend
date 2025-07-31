# Environment Configuration

This project uses environment variables to configure different settings for local development and production environments.

## Environment Files

### `.env.local`
- **Purpose**: Local development environment
- **Socket Server**: `http://192.168.29.30:3000` (host machine IP for Android emulator)
- **Debug**: Enabled
- **Log Level**: Debug

### `.env.live`
- **Purpose**: Production environment
- **Socket Server**: `https://video-call-backend-uifd.onrender.com`
- **Debug**: Disabled
- **Log Level**: Info
- **Performance**: Optimized

### `.env`
- **Purpose**: Default template file
- **Usage**: Copy and modify for your specific environment

## Key Environment Variables

### Socket Configuration
- `SOCKET_SERVER_URL`: WebSocket server URL for signaling
- `SOCKET_TIMEOUT`: Connection timeout in milliseconds
- `SOCKET_RECONNECTION_ATTEMPTS`: Number of reconnection attempts
- `SOCKET_RECONNECTION_DELAY`: Delay between reconnection attempts

### WebRTC Configuration
- `WEBRTC_STUN_SERVERS`: Comma-separated list of STUN servers
- `TURN_SERVER_URL`: TURN server URL (optional)
- `TURN_USERNAME`: TURN server username (optional)
- `TURN_CREDENTIAL`: TURN server credential (optional)

### Media Configuration
- `DEFAULT_VIDEO_WIDTH`: Default video width
- `DEFAULT_VIDEO_HEIGHT`: Default video height
- `DEFAULT_VIDEO_FRAME_RATE`: Default video frame rate
- `DEFAULT_SCREEN_WIDTH`: Default screen sharing width
- `DEFAULT_SCREEN_HEIGHT`: Default screen sharing height

### Feature Flags
- `ENABLE_SCREEN_SHARING`: Enable/disable screen sharing
- `ENABLE_CHAT`: Enable/disable chat functionality
- `ENABLE_PARTICIPANT_LIST`: Enable/disable participant list

### Debug Configuration
- `DEBUG`: Enable/disable debug mode
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Usage

### Automatic Environment Detection (Recommended):

The app now automatically detects the environment based on the build mode:

1. **For Local Development** (Debug builds):
   ```bash
   npm run android:local
   # or
   npm run ios:local
   ```
   - Automatically uses: `http://192.168.29.30:3000`

2. **For Production** (Release builds):
   ```bash
   npm run android:live
   # or
   npm run ios:live
   ```
   - Automatically uses: `https://video-call-backend-uifd.onrender.com`

### Manual Environment Switching (Legacy):

If you need to manually switch environments:
```bash
npm run env:local
npm run env:live
```

### Manual Environment Switching:

1. **For Local Development**:
   ```bash
   cp .env.local .env
   ```

2. **For Production**:
   ```bash
   cp .env.live .env
   ```

3. **Custom Configuration**:
   ```bash
   cp .env .env.custom
   # Edit .env.custom with your settings
   cp .env.custom .env
   ```

### View Current Environment:
```bash
npm run env:show
```

## Important Notes

- The `.env` file is used by the application at runtime
- Never commit sensitive information like API keys or credentials
- Use different environment files for different deployment stages
- The socket server URL should match your backend server
- **For Android emulator**: Use your host machine's IP address instead of `localhost`
- For production, consider using TURN servers for better connectivity

## Security

- Keep your `.env` files secure and never commit them to version control
- Use environment-specific files for different deployment environments
- Rotate credentials regularly in production environments

## Troubleshooting

### Socket Connection Issues

1. **Android Emulator Connection**: 
   - Android emulators can't connect to `localhost`
   - Use your host machine's IP address: `http://YOUR_IP:3000`
   - Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`

2. **iOS Simulator Connection**:
   - iOS simulators can use `localhost` or `127.0.0.1`

3. **Physical Device Connection**:
   - Use your host machine's IP address
   - Ensure device and host are on the same network

### Environment Variable Issues

1. **Variables not loading**: Restart Metro bundler after changing `.env` files
2. **TypeScript errors**: Ensure `src/types/env.d.ts` includes all variables
3. **Build errors**: Clear cache with `npx react-native start --reset-cache` 