import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/styles/theme';
import {
  canCreateRequest,
  canManageUsers,
  canUseNotifications,
  canViewAudit,
  canViewReports,
} from '../../src/utils/access';
import { formatStage } from '../../src/utils/format';

export default function MoreScreen() {
  const { user } = useAuth();
  const role = user?.role || '';

  const items = [
    {
      title: 'Dashboard',
      group: 'Overview',
      detail: 'Analytics and approval overview',
      href: '/dashboard',
      icon: 'grid-outline',
      show: true,
    },
    {
      title: 'New Travel Request',
      group: 'Travel Work',
      detail: 'Prepare and submit travel',
      href: '/request/new',
      icon: 'add-circle-outline',
      show: canCreateRequest(role),
    },
    {
      title: 'Submitted Requests',
      group: 'Travel Work',
      detail: 'Review assigned and historical travel requests',
      href: '/requests',
      icon: 'briefcase-outline',
      show: true,
    },
    {
      title: 'Travel Status',
      group: 'Travel Work',
      detail: 'Diagram view of request progress',
      href: '/status',
      icon: 'git-branch-outline',
      show: role !== 'pm_office',
    },
    {
      title: 'Notifications',
      group: 'Travel Work',
      detail: 'System messages and updates',
      href: '/notifications',
      icon: 'notifications-outline',
      show: canUseNotifications(role),
    },
    {
      title: 'Reports',
      group: 'Analytics',
      detail: 'Performance and travel analytics',
      href: '/reports',
      icon: 'bar-chart-outline',
      show: canViewReports(role),
    },
    {
      title: 'Pending Users',
      group: 'People Administration',
      detail: 'Approve account requests',
      href: '/admin/pending-users',
      icon: 'person-add-outline',
      show: canManageUsers(role),
    },
    {
      title: 'User Management',
      group: 'People Administration',
      detail: 'Officers and user accounts',
      href: '/admin/users',
      icon: 'people-outline',
      show: canManageUsers(role),
    },
    {
      title: 'Organization Settings',
      group: 'System Governance',
      detail: 'Structures, offices, affiliate institutions',
      href: '/admin/settings',
      icon: 'settings-outline',
      show: canManageUsers(role),
    },
    {
      title: 'Audit Trail',
      group: 'System Governance',
      detail: 'Accountability records',
      href: '/admin/audit',
      icon: 'shield-checkmark-outline',
      show: canViewAudit(role),
    },
    {
      title: 'Reset Password',
      group: 'Account Security',
      detail: 'Secure account password',
      href: '/account/password',
      icon: 'key-outline',
      show: role !== 'minister' && role !== 'pm_office',
    },
  ].filter((item) => item.show);

  const groups = [...new Set(items.map((item) => item.group))];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>System Menu</Text>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>
          {formatStage(role)} access for {user?.full_name || user?.email || 'FTMS user'}.
        </Text>
      </View>

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Available Features</Text>
        <Text style={styles.summaryValue}>{items.length}</Text>
        <Text style={styles.summaryDetail}>Role-based system workspaces visible on mobile.</Text>
      </Card>

      {groups.map((group) => (
        <View key={group} style={styles.group}>
          <Text style={styles.groupTitle}>{group}</Text>
          {items.filter((item) => item.group === group).map((item) => (
            <Pressable key={item.title} onPress={() => router.push(item.href)}>
              <Card style={styles.item}>
                <View style={styles.iconBox}>
                  <Ionicons name={item.icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.textBlock}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDetail}>{item.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Card>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  header: { marginBottom: 16 },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 4,
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  summaryCard: {
    marginBottom: 14,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  summaryDetail: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 2,
  },
  group: {
    marginBottom: 10,
  },
  groupTitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  textBlock: { flex: 1 },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  itemDetail: {
    color: colors.muted,
    lineHeight: 19,
    marginTop: 2,
  },
});
