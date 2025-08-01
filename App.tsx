import React, {useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {AppState, AppStateStatus} from 'react-native';
import {CallProvider} from './src/contexts/CallContext';
import HomeScreen from './src/screens/HomeScreen';
import CallScreen from './src/screens/CallScreen';

const Stack = createStackNavigator();

const App = () => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(
        'App state changed from',
        appState.current,
        'to',
        nextAppState,
      );

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        // App has come to the foreground
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('App has gone to the background!');
        // App has gone to the background
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <CallProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
          }}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{title: 'Video Calling App'}}
          />
          <Stack.Screen
            name="Call"
            component={CallScreen}
            options={{
              title: 'Video Call',
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </CallProvider>
  );
};

export default App;
