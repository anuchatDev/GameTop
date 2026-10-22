import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { CONTENT_WIDTH, MIN_TOUCH, useResponsive } from '../responsive';
import { colors } from '../theme';

/**
 * โครงหน้าจอ (Fluid layout): เนื้อหากว้างเต็มจอบนมือถือ และจำกัดความกว้างบนจอใหญ่
 *
 * @param width      narrow = หน้าเล่นเกม/ฟอร์ม (720px), wide = หน้าที่มีหลายคอลัมน์ (1200px)
 * @param background เปลี่ยนสีพื้นหลังทั้งจอ (เช่น กลางคืนของเกมหมาป่า)
 */
export function Screen({
  children,
  scroll = true,
  background,
  width = 'narrow',
}: {
  children: React.ReactNode;
  scroll?: boolean;
  background?: string;
  width?: keyof typeof CONTENT_WIDTH;
}) {
  const { gutter, isPhone } = useResponsive();
  const content: ViewStyle = {
    paddingHorizontal: gutter,
    paddingTop: isPhone ? 20 : 32,
    paddingBottom: 32,
    maxWidth: CONTENT_WIDTH[width] + gutter * 2,
  };
  return (
    <SafeAreaView style={[styles.safe, background ? { backgroundColor: background } : null]}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, content]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, content, { flex: 1 }]}>{children}</View>
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
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const bg = {
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    danger: colors.danger,
    ghost: 'transparent',
  }[variant];
  const inactive = disabled || loading;
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: inactive && !ghost ? colors.disabled : bg },
        ghost && styles.ghost,
        inactive && ghost && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
        // ปุ่มที่กดไม่ได้ใช้สีเทาเสมอ (ไม่ให้ style ที่ส่งมาทับจนดูเหมือนกดได้)
        inactive && !ghost ? { backgroundColor: colors.disabled } : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? colors.text : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, (ghost || inactive) && { color: ghost ? colors.text : colors.disabledText }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

/** ช่องกรอก — ใช้ placeholder เป็นชื่อสำหรับ Screen Reader ถ้าไม่ได้กำหนด · ตัวอักษร ≥16px กัน iOS ซูมเอง */
export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  const { fs } = useResponsive();
  return (
    <Text style={[styles.title, { fontSize: fs(28) }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { gap: 14, width: '100%', alignSelf: 'center' },
  button: {
    minHeight: MIN_TOUCH + 4,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.18)',
  },
  ghost: { borderWidth: 2, borderColor: colors.text, borderBottomWidth: 2 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  input: {
    // minWidth 0: บนเว็บช่องกรอกมีความกว้างตั้งต้น ถ้าไม่ตั้งไว้จะไม่ยอมหดในแถว ทำให้ปุ่มข้างๆ ล้นจอแคบ
    minWidth: 0,
    minHeight: MIN_TOUCH + 4,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.text,
  },
  title: { fontWeight: '900', color: colors.text },
  muted: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  error: { color: colors.danger, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.text,
  },
});
