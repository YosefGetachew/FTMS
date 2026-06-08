import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/styles/theme';
import { canUseNotifications, canViewReports } from '../../src/utils/access';

const iconFor = {
  dashboard: 'grid-outline',
  requests: 'briefcase-outline',
  status: 'git-branch-outline',
  reports: 'bar-chart-outline',
  notifications: 'notifications-outline',
  more: 'menu-outline',
  profile: 'person-circle-outline',
};

export default function TabsLayout() {
  const { user } = useAuth();
  const showReports = canViewReports(user?.role);
  const showNotifications = canUseNotifications(user?.role);
  const showStatus = user?.role !== 'pm_office';

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
      <Tabs.Screen name="status" options={{ title: 'Status', href: showStatus ? undefined : null }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', href: showReports ? undefined : null }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', href: showNotifications ? undefined : null }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
