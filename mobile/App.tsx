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
import { InsiderScreen } from './src/screens/insider/InsiderScreen';
import { SpyfallScreen } from './src/screens/spyfall/SpyfallScreen';
import { AvalonScreen } from './src/screens/avalon/AvalonScreen';
import { OhanaScreen } from './src/screens/ohana/OhanaScreen';
import { WerewolfScreen } from './src/screens/werewolf/WerewolfScreen';
import { prefs } from './src/gameRegistry';
import { readLineReturn } from './src/socialLogin';
import { storage } from './src/storage';
import { GameKey, games } from './src/theme';
import { AuthSession } from './src/types';

/** ชื่อ route ของห้องแต่ละเกม */
const GAME_ROUTES = {
  forbidden: 'room',
  werewolf: 'werewolf',
  ohana: 'ohana',
  insider: 'insider',
  spyfall: 'spyfall',
  avalon: 'avalon',
} as const satisfies Record<GameKey, string>;

/** key ที่จำห้องล่าสุดของแต่ละเกมไว้ในเบราว์เซอร์ (รีเฟรชแล้วกลับเข้าห้องเดิม) */
const ROOM_KEYS: Record<GameKey, string> = {
  forbidden: 'fw.room',
  werewolf: 'fw.werewolf',
  ohana: 'fw.ohana',
  insider: 'fw.insider',
  spyfall: 'fw.spyfall',
  avalon: 'fw.avalon',
};

const GAME_KEYS = Object.keys(GAME_ROUTES) as GameKey[];

type Route =
  | { name: 'home' }
  | { name: (typeof GAME_ROUTES)[GameKey]; code: string }
  | { name: 'profile' }
  | { name: 'admin' }
  | { name: 'random' }
  | { name: 'categories' }
  | { name: 'timer' };

const AUTH_KEY = 'fw.auth';

/** ลิงก์เข้าห้องจาก QR (?fw= ?ww= ?oh= ?in= ?sf= ?av= ตาม theme.games) — อ่านแล้วลบออกจาก URL กันกดรีเฟรชแล้วเข้าซ้ำ */
function readJoinLink(): Route | null {
  try {
    const loc = (globalThis as any).location;
    if (!loc?.search) return null;
    const params = new URLSearchParams(loc.search);
    const game = GAME_KEYS.find((g) => params.get(games[g].linkParam));
    if (!game) return null;
    const code = params.get(games[game].linkParam)!.toUpperCase();
    GAME_KEYS.forEach((g) => params.delete(games[g].linkParam));
    const rest = params.toString();
    (globalThis as any).history?.replaceState(null, '', loc.pathname + (rest ? '?' + rest : ''));
    return routeOfGame(game, code);
  } catch {
    return null;
  }
}

const joinLink = readJoinLink();
// กลับมาจากหน้า LINE Login (?code=&state=) — พร้อมห้องที่จะเข้าที่จำไว้ก่อนออกไป
const lineReturn = readLineReturn();
// เปิดจากลิงก์ตั้งรหัสผ่านใหม่ในอีเมล (?reset=)
const resetToken = readParam('reset');

/** อ่านค่าจาก URL แล้วลบออก กันกดรีเฟรชแล้วใช้ซ้ำ */
function readParam(name: string): string | null {
  try {
    const loc = (globalThis as any).location;
    if (!loc?.search) return null;
    const params = new URLSearchParams(loc.search);
    const value = params.get(name);
    if (!value) return null;
    params.delete(name);
    const rest = params.toString();
    (globalThis as any).history?.replaceState(null, '', loc.pathname + (rest ? '?' + rest : ''));
    return value;
  } catch {
    return null;
  }
}

export default function App() {
  // จำการล็อกอินและห้องล่าสุดไว้ — รีเฟรชหน้าแล้วกลับเข้าห้องเดิมได้ทันที
  // (เปิดลิงก์ตั้งรหัสผ่านใหม่ = เริ่มจากหน้าเข้าสู่ระบบเสมอ)
  const [auth, setAuth] = useState<AuthSession | null>(() => (resetToken ? null : storage.get<AuthSession>(AUTH_KEY)));
  // เปิดจากลิงก์ QR ก่อนล็อกอิน → ล็อกอินเสร็จแล้วพาเข้าห้องให้
  const [pending, setPending] = useState<Route | null>(() => joinLink ?? ((lineReturn?.afterLogin as Route | null) ?? null));
  // ใช้ได้ครั้งเดียว — ล็อกอินแล้วล้างทิ้ง (ออกจากระบบทีหลังจะไม่เอา code / ลิงก์เดิมมาใช้ซ้ำ)
  const [oneShot, setOneShot] = useState<{ lineCode?: string; resetToken?: string } | null>(() =>
    lineReturn || resetToken ? { lineCode: lineReturn?.code, resetToken: resetToken ?? undefined } : null,
  );
  const [route, setRoute] = useState<Route>(() => {
    if (!auth) return { name: 'home' };
    if (joinLink) return joinLink;
    for (const g of GAME_KEYS) {
      const code = storage.get<string>(ROOM_KEYS[g]);
      if (code) return routeOfGame(g, code);
    }
    return { name: 'home' };
  });

  useEffect(() => {
    if (auth) storage.set(AUTH_KEY, auth);
    else storage.remove(AUTH_KEY);
  }, [auth]);

  useEffect(() => {
    // จำห้องล่าสุดของเกมที่เล่นอยู่ (ได้ทีละเกม) — รีเฟรชแล้วกลับเข้าห้องเดิมทันที
    const game = gameOfRoute(route);
    if (game && 'code' in route) {
      for (const g of GAME_KEYS) {
        if (g === game) storage.set(ROOM_KEYS[g], route.code);
        else storage.remove(ROOM_KEYS[g]);
      }
      // ออกมาหน้าแรกแล้วยังมีปุ่ม "เล่นต่อ" + เรียงเกมที่เล่นล่าสุดขึ้นก่อน
      prefs.enteredRoom(game, route.code);
    } else if (route.name === 'home') {
      GAME_KEYS.forEach((g) => storage.remove(ROOM_KEYS[g]));
    }
    setDocumentTitle(route);
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
          invite={pending && gameOfRoute(pending) && 'code' in pending ? { game: gameOfRoute(pending)!, code: pending.code } : null}
          afterLogin={pending}
          lineCode={oneShot?.lineCode}
          resetToken={oneShot?.resetToken}
          onAuthenticated={(a) => {
            setAuth(a);
            setRoute(pending ?? { name: 'home' });
            setPending(null);
            setOneShot(null);
          }}
        />
      )}
      {auth && route.name === 'home' && (
        <HomeScreen
          auth={auth}
          onEnterGame={(game, code) => setRoute(routeOfGame(game, code))}
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
      {auth && route.name === 'insider' && <InsiderScreen auth={auth} code={route.code} onLeave={goHome} />}
      {auth && route.name === 'spyfall' && <SpyfallScreen auth={auth} code={route.code} onLeave={goHome} />}
      {auth && route.name === 'avalon' && <AvalonScreen auth={auth} code={route.code} onLeave={goHome} />}
      {auth && route.name === 'profile' && <ProfileScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'admin' && <AdminScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'random' && <RandomWordScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'categories' && <MyCategoriesScreen auth={auth} onBack={goHome} />}
      {route.name === 'timer' && <TimerScreen onBack={goHome} />}
    </View>
  );
}


function routeOfGame(game: GameKey, code: string): Route {
  return { name: GAME_ROUTES[game], code };
}

function gameOfRoute(route: Route): GameKey | null {
  const hit = (Object.keys(GAME_ROUTES) as GameKey[]).find((g) => GAME_ROUTES[g] === route.name);
  return hit ?? null;
}

const PAGE_TITLES: Partial<Record<Route['name'], string>> = {
  profile: 'โปรไฟล์ & คะแนน',
  admin: 'ผู้ดูแลระบบ',
  random: 'สุ่มคำ',
  categories: 'หมวดของฉัน',
  timer: 'จับเวลา',
};

/** ชื่อแท็บเบราว์เซอร์ของแต่ละหน้า — ในห้องเกมขึ้นชื่อเกม + รหัสห้อง */
function setDocumentTitle(route: Route) {
  const doc = (globalThis as any).document;
  if (!doc) return;
  const game = gameOfRoute(route);
  const page = game && 'code' in route ? `${games[game].name} · ห้อง ${route.code}` : PAGE_TITLES[route.name];
  doc.title = page ? `${page} — GameTop` : 'GameTop — เกมปาร์ตี้ออนไลน์';
}
