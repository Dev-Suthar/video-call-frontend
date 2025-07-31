import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {CallProvider} from './src/contexts/CallContext';
import HomeScreen from './src/screens/HomeScreen';
import CallScreen from './src/screens/CallScreen';

const Stack = createStackNavigator();

const App = () => {
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
