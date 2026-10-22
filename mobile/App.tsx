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
import { OhanaScreen } from './src/screens/ohana/OhanaScreen';
import { WerewolfScreen } from './src/screens/werewolf/WerewolfScreen';
import { prefs } from './src/gameRegistry';
import { storage } from './src/storage';
import { GameKey, games } from './src/theme';
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
  | { name: 'insider'; code: string }
  | { name: 'spyfall'; code: string }
  | { name: 'timer' };

const AUTH_KEY = 'fw.auth';
const ROOM_KEY = 'fw.room';
const WW_KEY = 'fw.werewolf';
const OH_KEY = 'fw.ohana';
const IN_KEY = 'fw.insider';
const SF_KEY = 'fw.spyfall';

/** ลิงก์เข้าห้องจาก QR (?fw= คำต้องห้าม / ?ww= หมาป่า / ?oh= OHANA / ?in= Insider / ?sf= Spyfall) — อ่านแล้วลบออกจาก URL กันกดรีเฟรชแล้วเข้าซ้ำ */
function readJoinLink(): Route | null {
  try {
    const loc = (globalThis as any).location;
    if (!loc?.search) return null;
    const params = new URLSearchParams(loc.search);
    const fw = params.get('fw');
    const ww = params.get('ww');
    const oh = params.get('oh');
    const ins = params.get('in');
    const sf = params.get('sf');
    if (!fw && !ww && !oh && !ins && !sf) return null;
    params.delete('fw');
    params.delete('ww');
    params.delete('oh');
    params.delete('in');
    params.delete('sf');
    const rest = params.toString();
    (globalThis as any).history?.replaceState(null, '', loc.pathname + (rest ? '?' + rest : ''));
    if (fw) return { name: 'room', code: fw.toUpperCase() };
    if (ww) return { name: 'werewolf', code: ww.toUpperCase() };
    if (oh) return { name: 'ohana', code: oh.toUpperCase() };
    return ins ? { name: 'insider', code: ins.toUpperCase() } : { name: 'spyfall', code: sf!.toUpperCase() };
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
    if (oh) return { name: 'ohana', code: oh };
    const ins = storage.get<string>(IN_KEY);
    if (ins) return { name: 'insider', code: ins };
    const sf = storage.get<string>(SF_KEY);
    return sf ? { name: 'spyfall', code: sf } : { name: 'home' };
  });

  useEffect(() => {
    if (auth) storage.set(AUTH_KEY, auth);
    else storage.remove(AUTH_KEY);
  }, [auth]);

  useEffect(() => {
    // จำห้องล่าสุดของเกมที่เล่นอยู่ (ได้ทีละเกม) — รีเฟรชแล้วกลับเข้าห้องเดิมทันที
    const keys = { room: ROOM_KEY, werewolf: WW_KEY, ohana: OH_KEY, insider: IN_KEY, spyfall: SF_KEY } as const;
    const game = gameOfRoute(route);
    if (game && 'code' in route) {
      for (const [name, key] of Object.entries(keys)) {
        if (name === route.name) storage.set(key, route.code);
        else storage.remove(key);
      }
      // ออกมาหน้าแรกแล้วยังมีปุ่ม "เล่นต่อ" + เรียงเกมที่เล่นล่าสุดขึ้นก่อน
      prefs.enteredRoom(game, route.code);
    } else if (route.name === 'home') {
      Object.values(keys).forEach((k) => storage.remove(k));
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
      {auth && route.name === 'profile' && <ProfileScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'admin' && <AdminScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'random' && <RandomWordScreen auth={auth} onBack={goHome} />}
      {auth && route.name === 'categories' && <MyCategoriesScreen auth={auth} onBack={goHome} />}
      {route.name === 'timer' && <TimerScreen onBack={goHome} />}
    </View>
  );
}

const GAME_ROUTES = { forbidden: 'room', werewolf: 'werewolf', ohana: 'ohana', insider: 'insider', spyfall: 'spyfall' } as const;

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
