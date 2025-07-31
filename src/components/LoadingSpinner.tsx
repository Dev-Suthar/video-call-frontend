import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet} from 'react-native';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  duration?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color = '#007AFF',
  duration = 1000,
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    );
    spinAnimation.start();

    return () => spinAnimation.stop();
  }, [spinValue, duration]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderColor: color,
            transform: [{rotate: spin}],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 50,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export default LoadingSpinner; 