import '../../global.css';

import { Stack } from 'expo-router';

import { AppSessionProvider } from '../contexts/AppSessionContext';

export default function RootLayout() {
  return (
    <AppSessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </AppSessionProvider>
  );
}