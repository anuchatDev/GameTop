import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors } from '../theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const bg = {
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    danger: colors.danger,
    ghost: 'transparent',
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: inactive && variant !== 'ghost' ? colors.disabled : bg },
        variant === 'ghost' && styles.ghost,
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.buttonText, variant === 'ghost' && { color: colors.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  // จำกัดความกว้างบนจอคอม (web) ให้หน้าตาเหมือนบนมือถือ
  content: { padding: 20, paddingTop: 48, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.18)',
  },
  ghost: { borderWidth: 2, borderColor: colors.text, borderBottomWidth: 2 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: colors.text,
  },
  title: { fontSize: 28, fontWeight: '900', color: colors.text },
  muted: { fontSize: 15, color: colors.muted },
  error: { color: colors.danger, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.text,
  },
});
