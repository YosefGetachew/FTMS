import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { colors } from '../src/styles/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor={colors.primary} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Create Account' }} />
        <Stack.Screen name="request/new" options={{ title: 'New Travel Request' }} />
        <Stack.Screen name="request/[id]" options={{ title: 'Request Details' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
