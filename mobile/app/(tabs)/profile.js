import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/styles/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const logout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.name}>{user?.full_name || 'FTMS User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <Info label="Role" value={user?.role} />
        <Info label="Structure" value={user?.sector} />
        <Info label="Department" value={user?.department} />

        <Button variant="danger" style={styles.logout} onPress={logout}>Logout</Button>
      </Card>
    </Screen>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  name: { color: colors.text, fontSize: 23, fontWeight: '900' },
  email: { color: colors.muted, marginBottom: 8 },
  info: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 12 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  value: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 3, textTransform: 'capitalize' },
  logout: { marginTop: 12 },
});
