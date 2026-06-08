import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Notice } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import API, { getApiErrorMessage } from '../../src/services/api';
import { colors } from '../../src/styles/theme';

export default function PasswordScreen() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const submit = async () => {
    if (!currentPassword || !newPassword) {
      setNotice({ type: 'error', message: 'Current and new passwords are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    try {
      setLoading(true);
      setNotice(null);
      await API.put(`/users/${user.id}/change-password`, {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({ type: 'success', message: 'Password updated successfully.' });
    } catch (err) {
      setNotice({ type: 'error', message: getApiErrorMessage(err, 'Failed to update password.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Account Security</Text>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Update the password for {user?.email || 'your account'}.</Text>
      </View>

      {notice ? <Notice type={notice.type}>{notice.message}</Notice> : null}

      <Card>
        <Field label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <Field label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <Field label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <Button loading={loading} onPress={submit}>Update Password</Button>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { padding: 16 },
  header: { marginBottom: 16 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 4 },
});
