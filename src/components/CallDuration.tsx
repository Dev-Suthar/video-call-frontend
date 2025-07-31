import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface CallDurationProps {
  duration: number; // in seconds
}

const CallDuration: React.FC<CallDurationProps> = ({duration}) => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.durationText}>{formatDuration(duration)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    position: 'absolute',
    top: 60,
    left: 20,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CallDuration; 