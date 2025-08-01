# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# WebRTC rules
-keep class org.webrtc.** { *; }
-keep class com.twilio.video.** { *; }
-keep class io.pristine.libjingle.** { *; }

# React Native WebRTC
-keep class com.oney.WebRTCModule.** { *; }
-keep class com.oney.WebRTCModule.RTCPeerConnection.** { *; }
-keep class com.oney.WebRTCModule.MediaStream.** { *; }
-keep class com.oney.WebRTCModule.MediaStreamTrack.** { *; }

# Socket.IO
-keep class io.socket.** { *; }
-keep class io.socket.client.** { *; }
-keep class io.socket.engineio.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Keep JavaScript interface classes
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep WebRTC native methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
} 