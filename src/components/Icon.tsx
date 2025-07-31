import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {StyleSheet} from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
  type?: 'material' | 'community';
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#ffffff',
  style,
  type = 'material',
}) => {
  const IconComponent = type === 'community' ? MaterialCommunityIcons : MaterialIcons;

  return (
    <IconComponent
      name={name}
      size={size}
      color={color}
      style={[styles.icon, style]}
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    // Default icon styles
  },
});

export default Icon; 