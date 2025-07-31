import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from './Icon';

interface ErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  type = 'error',
}) => {
  if (!error) {
    return null;
  }

  const getErrorConfig = () => {
    switch (type) {
      case 'error':
        return {
          backgroundColor: '#FF3B30',
          icon: 'error',
          iconColor: '#ffffff',
        };
      case 'warning':
        return {
          backgroundColor: '#FF9500',
          icon: 'warning',
          iconColor: '#ffffff',
        };
      case 'info':
        return {
          backgroundColor: '#007AFF',
          icon: 'info',
          iconColor: '#ffffff',
        };
      default:
        return {
          backgroundColor: '#FF3B30',
          icon: 'error',
          iconColor: '#ffffff',
        };
    }
  };

  const config = getErrorConfig();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: config.backgroundColor}]}>
      <View style={styles.content}>
        <Icon
          name={config.icon}
          size={20}
          color={config.iconColor}
          style={styles.icon}
        />
        <Text style={styles.errorText}>{error}</Text>
      </View>
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity style={styles.actionButton} onPress={handleRetry}>
            <Text style={styles.actionText}>Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity style={styles.actionButton} onPress={handleDismiss}>
            <Text style={styles.actionText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    marginLeft: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ErrorDisplay; 