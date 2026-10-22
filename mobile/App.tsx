import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { api, setUnauthorizedHandler } from './src/api/client';
import { AppBar, NavKey } from './src/components/AppBar';
import { AdminScreen } from './src/screens/AdminScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { MyCategoriesScreen } from './src/screens/MyCategoriesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RandomWordScreen } from './src/screens/RandomWordScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { TimerScreen } from './src/screens/TimerScreen';
import { OhanaScreen } from './src/screens/ohana/OhanaScreen';
import { WerewolfScreen } from './src/screens/werewolf/WerewolfScreen';
import { storage } from './src/storage';
import { AuthSession } from './src/types';

type Route =
  | { name: 'home' }
  | { name: 'room'; code: string }
  | { name: 'profile' }
  | { name: 'admin' }
  | { name: 'random' }
  | { name: 'categories' }
  | { name: 'werewolf'; code: string }
  | { name: 'ohana'; code: string }
  | { name: 'timer' };

const AUTH_KEY = 'fw.auth';
const ROOM_KEY = 'fw.room';
const WW_KEY = 'fw.werewolf';
const OH_KEY = 'fw.ohana';

/** ลิงก์เข้าห้องจาก QR (?fw= คำต้องห้าม / ?ww= หมาป่า / ?oh= OHANA) — อ่านแล้วลบออกจาก URL กันกดรีเฟรชแล้วเข้าซ้ำ */
function readJoinLink(): Route | null {
  try {
    const loc = (globalThis as any).location;
    if (!loc?.search) return null;
    const params = new URLSearchParams(loc.search);
    const fw = params.get('fw');
    const ww = params.get('ww');
    const oh = params.get('oh');
    if (!fw && !ww && !oh) return null;
    params.delete('fw');
    params.delete('ww');
    params.delete('oh');
    const rest = params.toString();
    (globalThis as any).history?.replaceState(null, '', loc.pathname + (rest ? '?' + rest : ''));
    if (fw) return { name: 'room', code: fw.toUpperCase() };
    return ww ? { name: 'werewolf', code: ww.toUpperCase() } : { name: 'ohana', code: oh!.toUpperCase() };
  } catch {
    return null;
  }
}

const joinLink = readJoinLink();

export default function App() {
  // จำการล็อกอินและห้องล่าสุดไว้ — รีเฟรชหน้าแล้วกลับเข้าห้องเดิมได้ทันที
  const [auth, setAuth] = useState<AuthSession | null>(() => storage.get<AuthSession>(AUTH_KEY));
  // เปิดจากลิงก์ QR ก่อนล็อกอิน → ล็อกอินเสร็จแล้วพาเข้าห้องให้
  const [pending, setPending] = useState<Route | null>(() => joinLink);
  const [route, setRoute] = useState<Route>(() => {
    if (!auth) return { name: 'home' };
    if (joinLink) return joinLink;
    const code = storage.get<string>(ROOM_KEY);
    if (code) return { name: 'room', code };
    const ww = storage.get<string>(WW_KEY);
    if (ww) return { name: 'werewolf', code: ww };
    const oh = storage.get<string>(OH_KEY);
    return oh ? { name: 'ohana', code: oh } : { name: 'home' };
  });

  useEffect(() => {
    if (auth) storage.set(AUTH_KEY, auth);
    else storage.remove(AUTH_KEY);
  }, [auth]);

  useEffect(() => {
    // จำห้องล่าสุดของเกมที่เล่นอยู่ (ได้ทีละเกม)
    const keys = { room: ROOM_KEY, werewolf: WW_KEY, ohana: OH_KEY } as const;
    if (route.name === 'room' || route.name === 'werewolf' || route.name === 'ohana') {
      for (const [name, key] of Object.entries(keys)) {
        if (name === route.name) storage.set(key, route.code);
        else storage.remove(key);
      }
    } else if (route.name === 'home') {
      Object.values(keys).forEach((k) => storage.remove(k));
    }
  }, [route]);

  // ตรวจ token ที่จำไว้ และอัปเดตสิทธิ์ (เช่น เพิ่งถูกตั้งเป็น Admin) — token หมดอายุจะถูกพาไปหน้าล็อกอิน
  const token = auth?.token;
  useEffect(() => {
    if (!token) return;
    api
      .me({ token, user: { id: 0, username: '', role: 'PLAYER' } })
      .then((p) =>
        setAuth((a) =>
          a && a.token === token && a.user.role !== p.role ? { ...a, user: { ...a.user, role: p.role } } : a,
        ),
      )
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuth(null);
      setRoute({ name: 'home' });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const goHome = () => setRoute({ name: 'home' });

  function logout() {
    setAuth(null);
    goHome();
  }

  // แถบนำทางแสดงในหน้าทั่วไป — ในห้องเกมซ่อนไว้ให้จอเกมเต็มที่ (มีปุ่มออกจากห้องอยู่แล้ว)
  const navKeys: NavKey[] = ['home', 'profile', 'random', 'categories', 'timer', 'admin'];
  const navCurrent = navKeys.includes(route.name as NavKey) ? (route.name as NavKey) : null;
  const showBar = !!auth && navCurrent !== null;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {showBar && (
        <AppBar
          current={navCurrent}
          isAdmin={auth!.user.role === 'ADMIN'}
          username={auth!.user.username}
          onNavigate={(key) => setRoute({ name: key } as Route)}
          onLogout={logout}
        />
      )}
      {!auth && route.name !== 'timer' && (
        <AuthScreen
          onAuthenticated={(a) => {
            setAuth(a);
            setRoute(pending ?? { name: 'home' });
            setPending(null);
          }}
        />
      )}
      {auth && route.name === 'home' && (
        <HomeScreen
          auth={auth}
          onEnterRoom={(code) => setRoute({ name: 'room', code })}
          onEnterWerewolf={(code) => setRoute({ name: 'werewolf', code })}
          onEnterOhana={(code) => setRoute({ name: 'ohana', code })}
          onOpenProfile={() => setRoute({ name: 'profile' })}
          onOpenAdmin={() => setRoute({ name: 'admin' })}
          onOpenRandom={() => setRoute({ name: 'random' })}
          onOpenCategories={() => setRoute({ name: 'categories' })}
          onOpenTimer={() => setRoute({ name: 'timer' })}
          onLogout={logout}
        />
      )}
      {auth && route.name === 'room' && <RoomScreen auth={auth} code={route.code} onLeave={goHome} />}
      {auth && route.name === 'werewolf' && <WerewolfScreen auth={auth} code={route.code} onLeave={goHome} />}
      {auth && route.name === 'ohana' && <OhanaScreen auth={auth} code={route.code} onLeave={goHome} />}
      {auth && route.name === 'profile' && <ProfileScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'admin' && <AdminScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'random' && <RandomWordScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'categories' && <MyCategoriesScreen auth={auth} onBack={goHome} />}
      {route.name === 'timer' && <TimerScreen onBack={goHome} />}
    </View>
  );
}
