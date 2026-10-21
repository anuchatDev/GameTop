import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';

import { HomeScreen } from './src/screens/HomeScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { TimerScreen } from './src/screens/TimerScreen';
import { Session } from './src/types';

type Route = { name: 'home' } | { name: 'room'; session: Session } | { name: 'timer' };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const goHome = () => setRoute({ name: 'home' });

  return (
    <>
      <StatusBar style="dark" />
      {route.name === 'home' && (
        <HomeScreen
          onJoined={(session) => setRoute({ name: 'room', session })}
          onOpenTimer={() => setRoute({ name: 'timer' })}
        />
      )}
      {route.name === 'room' && <RoomScreen session={route.session} onLeave={goHome} />}
      {route.name === 'timer' && <TimerScreen onBack={goHome} />}
    </>
  );
}
