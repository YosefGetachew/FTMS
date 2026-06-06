import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '../../src/styles/theme';

const iconFor = {
  dashboard: 'grid-outline',
  requests: 'briefcase-outline',
  status: 'git-branch-outline',
  notifications: 'notifications-outline',
  profile: 'person-circle-outline',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border, height: 62, paddingBottom: 8 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={iconFor[route.name] || 'ellipse-outline'} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests' }} />
      <Tabs.Screen name="status" options={{ title: 'Status' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
