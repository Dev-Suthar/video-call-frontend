import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from './Icon';

interface ConnectionQualityIndicatorProps {
  quality: 'excellent' | 'good' | 'poor' | 'disconnected';
  showLabel?: boolean;
}

const ConnectionQualityIndicator: React.FC<ConnectionQualityIndicatorProps> = ({
  quality,
  showLabel = true,
}) => {
  const getQualityConfig = () => {
    switch (quality) {
      case 'excellent':
        return {
          color: '#34C759',
          icon: 'signal-cellular-4-bar',
          label: 'Excellent',
        };
      case 'good':
        return {
          color: '#FF9500',
          icon: 'signal-cellular-3-bar',
          label: 'Good',
        };
      case 'poor':
        return {
          color: '#FF3B30',
          icon: 'signal-cellular-1-bar',
          label: 'Poor',
        };
      case 'disconnected':
        return {
          color: '#8E8E93',
          icon: 'signal-cellular-off',
          label: 'Disconnected',
        };
      default:
        return {
          color: '#8E8E93',
          icon: 'signal-cellular-off',
          label: 'Unknown',
        };
    }
  };

  const config = getQualityConfig();

  return (
    <View style={styles.container}>
      <Icon
        name={config.icon}
        size={16}
        color={config.color}
        style={styles.icon}
      />
      {showLabel && (
        <Text style={[styles.label, {color: config.color}]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ConnectionQualityIndicator; 