import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { RequestsProvider } from '../src/context/RequestsContext';
import { colors } from '../src/styles/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RequestsProvider>
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
          <Stack.Screen name="admin/pending-users" options={{ title: 'Pending Users' }} />
          <Stack.Screen name="admin/users" options={{ title: 'User Management' }} />
          <Stack.Screen name="admin/settings" options={{ title: 'Organization Settings' }} />
          <Stack.Screen name="admin/audit" options={{ title: 'Audit Trail' }} />
          <Stack.Screen name="account/password" options={{ title: 'Reset Password' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </RequestsProvider>
    </AuthProvider>
  );
}
