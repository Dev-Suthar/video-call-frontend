// Environment configuration
// This file can be updated by npm scripts to switch environments

export const ENVIRONMENT_CONFIG = {
  // Set this to 'local' or 'live' to override the automatic detection
  FORCE_ENVIRONMENT: null as 'local' | 'live' | null,

  // Get the current environment
  getCurrentEnvironment: (): 'local' | 'live' => {
    // If forced environment is set, use it
    if (ENVIRONMENT_CONFIG.FORCE_ENVIRONMENT) {
      return ENVIRONMENT_CONFIG.FORCE_ENVIRONMENT;
    }

    // Otherwise use automatic detection
    if (!__DEV__) {
      return 'live';
    }
    return 'local';
  },
};

console.log(
  '🔧 ENVIRONMENT_CONFIG loaded with FORCE_ENVIRONMENT:',
  ENVIRONMENT_CONFIG.FORCE_ENVIRONMENT,
);
