import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const triggerHaptic = (type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy') => {
  try {
    switch (type) {
      case 'success':
        ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
        break;
      case 'error':
        ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
        break;
      case 'warning':
        ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
        break;
      case 'light':
        ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
        break;
      case 'medium':
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        break;
      case 'heavy':
        ReactNativeHapticFeedback.trigger('impactHeavy', hapticOptions);
        break;
      default:
        ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    }
  } catch (error) {
    console.log('Haptic feedback not available:', error);
  }
};

export const hapticSuccess = () => triggerHaptic('success');
export const hapticError = () => triggerHaptic('error');
export const hapticWarning = () => triggerHaptic('warning');
export const hapticLight = () => triggerHaptic('light');
export const hapticMedium = () => triggerHaptic('medium');
export const hapticHeavy = () => triggerHaptic('heavy'); 