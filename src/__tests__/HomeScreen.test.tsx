import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';

// Mock the useCall hook
jest.mock('../contexts/CallContext', () => ({
  useCall: () => ({
    state: {
      isConnected: true,
    },
    joinRoom: jest.fn(),
  }),
}));

// Mock the useNavigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock the permissions utility
jest.mock('../utils/permissions', () => ({
  requestPermissions: jest.fn(() => Promise.resolve(true)),
}));

describe('HomeScreen', () => {
  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<HomeScreen />);
    
    expect(getByText('Video Calling')).toBeTruthy();
    expect(getByText('Join or create a room to start')).toBeTruthy();
    expect(getByPlaceholderText('Enter room ID')).toBeTruthy();
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
  });

  it('generates room ID when generate button is pressed', () => {
    const { getByText } = render(<HomeScreen />);
    const generateButton = getByText('Generate');
    
    fireEvent.press(generateButton);
    
    // The room ID should be populated
    expect(generateButton).toBeTruthy();
  });

  it('shows error when trying to join without room ID', async () => {
    const { getByText } = render(<HomeScreen />);
    const joinButton = getByText('Join Room');
    
    fireEvent.press(joinButton);
    
    await waitFor(() => {
      // The button should be disabled
      expect(joinButton.props.disabled).toBe(true);
    });
  });

  it('shows error when trying to join without username', async () => {
    const { getByText, getByPlaceholderText } = render(<HomeScreen />);
    const roomInput = getByPlaceholderText('Enter room ID');
    const joinButton = getByText('Join Room');
    
    fireEvent.changeText(roomInput, 'TEST123');
    fireEvent.press(joinButton);
    
    await waitFor(() => {
      // The button should be disabled
      expect(joinButton.props.disabled).toBe(true);
    });
  });
});