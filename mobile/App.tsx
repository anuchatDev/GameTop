import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';

import { api, setUnauthorizedHandler } from './src/api/client';
import { AdminScreen } from './src/screens/AdminScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { TimerScreen } from './src/screens/TimerScreen';
import { storage } from './src/storage';
import { AuthSession } from './src/types';

type Route =
  | { name: 'home' }
  | { name: 'room'; code: string }
  | { name: 'profile' }
  | { name: 'admin' }
  | { name: 'timer' };

const AUTH_KEY = 'fw.auth';
const ROOM_KEY = 'fw.room';

export default function App() {
  // จำการล็อกอินและห้องล่าสุดไว้ — รีเฟรชหน้าแล้วกลับเข้าห้องเดิมได้ทันที
  const [auth, setAuth] = useState<AuthSession | null>(() => storage.get<AuthSession>(AUTH_KEY));
  const [route, setRoute] = useState<Route>(() => {
    const code = storage.get<string>(ROOM_KEY);
    return auth && code ? { name: 'room', code } : { name: 'home' };
  });

  useEffect(() => {
    if (auth) storage.set(AUTH_KEY, auth);
    else storage.remove(AUTH_KEY);
  }, [auth]);

  useEffect(() => {
    if (route.name === 'room') storage.set(ROOM_KEY, route.code);
    else if (route.name === 'home') storage.remove(ROOM_KEY);
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

  return (
    <>
      <StatusBar style="dark" />
      {!auth && route.name !== 'timer' && (
        <AuthScreen
          onAuthenticated={(a) => {
            setAuth(a);
            goHome();
          }}
        />
      )}
      {auth && route.name === 'home' && (
        <HomeScreen
          auth={auth}
          onEnterRoom={(code) => setRoute({ name: 'room', code })}
          onOpenProfile={() => setRoute({ name: 'profile' })}
          onOpenAdmin={() => setRoute({ name: 'admin' })}
          onOpenTimer={() => setRoute({ name: 'timer' })}
          onLogout={logout}
        />
      )}
      {auth && route.name === 'room' && <RoomScreen auth={auth} code={route.code} onLeave={goHome} />}
      {auth && route.name === 'profile' && <ProfileScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'admin' && <AdminScreen auth={auth} onBack={goHome} />}
      {route.name === 'timer' && <TimerScreen onBack={goHome} />}
    </>
  );
}
