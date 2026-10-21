import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';

import { setUnauthorizedHandler } from './src/api/client';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { TimerScreen } from './src/screens/TimerScreen';
import { AuthSession } from './src/types';

type Route = { name: 'home' } | { name: 'room'; code: string } | { name: 'profile' } | { name: 'timer' };

export default function App() {
  // ตาม BRD เวอร์ชัน MVP: เก็บ token ไว้ในหน่วยความจำเท่านั้น (ไม่ใช้ localStorage/cookie)
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const goHome = () => setRoute({ name: 'home' });

  useEffect(() => {
    setUnauthorizedHandler(() => setAuth(null));
    return () => setUnauthorizedHandler(null);
  }, []);

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
          onOpenTimer={() => setRoute({ name: 'timer' })}
          onLogout={logout}
        />
      )}
      {auth && route.name === 'room' && <RoomScreen auth={auth} code={route.code} onLeave={goHome} />}
      {auth && route.name === 'profile' && <ProfileScreen auth={auth} onBack={goHome} />}
      {route.name === 'timer' && <TimerScreen onBack={goHome} />}
    </>
  );
}
