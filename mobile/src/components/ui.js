import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../styles/theme';

export function Screen({ children }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ children, variant = 'primary', loading, style, disabled, ...props }) {
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.secondaryButton,
        isDanger && styles.dangerButton,
        (pressed || disabled || loading) && { opacity: 0.72 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, isSecondary && styles.secondaryButtonText]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, multiline, error, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholderTextColor="#89958e"
        style={[styles.input, multiline && styles.textarea, error && styles.inputError]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Notice({ type = 'info', children }) {
  return (
    <View style={[styles.notice, type === 'error' && styles.noticeError, type === 'success' && styles.noticeSuccess]}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function EmptyState({ title, message }) {
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  field: {
    gap: 6,
    marginBottom: 14,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  textarea: {
    minHeight: 112,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
  },
  notice: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  noticeError: {
    backgroundColor: '#fff2f0',
    borderColor: '#ffccc7',
  },
  noticeSuccess: {
    backgroundColor: '#edf8f1',
    borderColor: '#b7e4c7',
  },
  noticeText: {
    color: colors.text,
    lineHeight: 19,
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyMessage: {
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
});
