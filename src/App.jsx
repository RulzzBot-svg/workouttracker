import { useState } from 'react';
import WorkoutLog from './WorkoutLog';
import Auth from './Auth';
import Profile from './Profile';
import Friends from './Friends';

function loadSession() {
  try {
    const token = localStorage.getItem('wt_token');
    const user = localStorage.getItem('wt_user');
    if (token && user) return { token, user: JSON.parse(user) };
  } catch {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
  }
  return { token: null, user: null };
}

function App() {
  const [{ user, token }, setSession] = useState(loadSession);
  const [page, setPage] = useState('log'); // 'log' | 'profile' | 'friends'

  const handleLogin = (u, t) => {
    setSession({ user: u, token: t });
    setPage('log');
  };

  const handleLogout = () => {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
    setSession({ user: null, token: null });
    setPage('log');
  };

  if (!user || !token) {
    return <Auth onLogin={handleLogin} />;
  }

  if (page === 'profile') {
    return <Profile user={user} onBack={() => setPage('log')} />;
  }

  if (page === 'friends') {
    return <Friends onBack={() => setPage('log')} />;
  }

  return (
    <WorkoutLog
      user={user}
      token={token}
      onLogout={handleLogout}
      onProfile={() => setPage('profile')}
      onFriends={() => setPage('friends')}
    />
  );
}

export default App;

