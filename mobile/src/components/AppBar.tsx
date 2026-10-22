import React, { useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH, useResponsive } from '../responsive';
import { colors } from '../theme';

export type NavKey = 'home' | 'profile' | 'random' | 'categories' | 'timer' | 'admin';

interface NavItem {
  key: NavKey;
  icon: string;
  label: string;
}

/**
 * แถบนำทางด้านบน — มือถือใช้ปุ่ม ☰ (Hamburger) เปิดเมนู, แท็บเล็ต/เดสก์ท็อปแสดงลิงก์ในแถบเลย
 * ทุกปุ่มสูงอย่างน้อย 44px สำหรับนิ้ว
 */
export function AppBar({
  current,
  isAdmin,
  username,
  onNavigate,
  onLogout,
}: {
  current: NavKey | null;
  isAdmin: boolean;
  username: string;
  onNavigate: (key: NavKey) => void;
  onLogout: () => void;
}) {
  const { isPhone, gutter } = useResponsive();
  const [open, setOpen] = useState(false);

  const items: NavItem[] = [
    { key: 'home', icon: '🎮', label: 'เกมทั้งหมด' },
    { key: 'profile', icon: '🏆', label: 'โปรไฟล์' },
    { key: 'random', icon: '🎲', label: 'สุ่มคำ' },
    { key: 'categories', icon: '📚', label: 'หมวดของฉัน' },
    { key: 'timer', icon: '⏳', label: 'จับเวลา' },
    ...(isAdmin ? [{ key: 'admin' as const, icon: '🛠️', label: 'ผู้ดูแลระบบ' }] : []),
  ];

  function go(key: NavKey) {
    setOpen(false);
    onNavigate(key);
  }

  return (
    <View style={styles.bar} accessibilityRole="header">
      <View style={[styles.inner, { paddingHorizontal: gutter }]}>
        <Pressable onPress={() => go('home')} style={styles.brand} accessibilityRole="link" accessibilityLabel="GameTop หน้าแรก">
          <Text style={styles.brandText}>🎮 GameTop</Text>
        </Pressable>

        {isPhone ? (
          <Pressable
            onPress={() => setOpen(true)}
            style={styles.burger}
            accessibilityRole="button"
            accessibilityLabel="เปิดเมนู"
            accessibilityState={{ expanded: open }}
          >
            <Text style={styles.burgerText}>☰</Text>
          </Pressable>
        ) : (
          <View style={styles.links} accessibilityRole="menubar">
            {items.map((it) => (
              <Pressable
                key={it.key}
                onPress={() => go(it.key)}
                style={[styles.link, current === it.key && styles.linkOn]}
                accessibilityRole="link"
                accessibilityState={{ selected: current === it.key }}
              >
                <Text style={[styles.linkText, current === it.key && { color: '#fff' }]}>
                  {it.icon} {it.label}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={onLogout} style={styles.link} accessibilityRole="button">
              <Text style={styles.linkText}>ออกจากระบบ</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="ปิดเมนู">
          <SafeAreaView style={styles.sheetWrap}>
            <Pressable style={styles.sheet} onPress={() => {}} accessibilityRole="menu">
              <View style={styles.sheetHead}>
                <Text style={styles.sheetUser}>👋 {username}</Text>
                <Pressable onPress={() => setOpen(false)} style={styles.burger} accessibilityRole="button" accessibilityLabel="ปิดเมนู">
                  <Text style={styles.burgerText}>✕</Text>
                </Pressable>
              </View>
              {items.map((it) => (
                <Pressable
                  key={it.key}
                  onPress={() => go(it.key)}
                  style={[styles.menuItem, current === it.key && styles.menuItemOn]}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: current === it.key }}
                >
                  <Text style={styles.menuIcon}>{it.icon}</Text>
                  <Text style={[styles.menuText, current === it.key && { color: '#fff' }]}>{it.label}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  setOpen(false);
                  onLogout();
                }}
                style={styles.menuItem}
                accessibilityRole="menuitem"
              >
                <Text style={styles.menuIcon}>🚪</Text>
                <Text style={styles.menuText}>ออกจากระบบ</Text>
              </Pressable>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.card, borderBottomWidth: 2, borderBottomColor: colors.text },
  inner: {
    width: '100%',
    maxWidth: 1248,
    alignSelf: 'center',
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  brandText: { fontSize: 20, fontWeight: '900', color: colors.text },
  burger: {
    width: MIN_TOUCH + 4,
    height: MIN_TOUCH + 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burgerText: { fontSize: 22, fontWeight: '900', color: colors.text },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', flexShrink: 1, paddingVertical: 8 },
  link: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999 },
  linkOn: { backgroundColor: colors.text },
  linkText: { fontSize: 15, fontWeight: '800', color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { flex: 1, alignItems: 'flex-end' },
  sheet: {
    width: 290,
    maxWidth: '88%',
    height: '100%',
    backgroundColor: colors.bg,
    borderLeftWidth: 2,
    borderLeftColor: colors.text,
    padding: 16,
    gap: 6,
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetUser: { fontSize: 18, fontWeight: '900', color: colors.text, flexShrink: 1 },
  menuItem: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 14 },
  menuItemOn: { backgroundColor: colors.text },
  menuIcon: { fontSize: 22 },
  menuText: { fontSize: 17, fontWeight: '800', color: colors.text },
});
