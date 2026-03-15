import { useState } from 'react';
import WorkoutLog from './WorkoutLog';
import Auth from './Auth';

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

  const handleLogin = (u, t) => {
    setSession({ user: u, token: t });
  };

  const handleLogout = () => {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
    setSession({ user: null, token: null });
  };

  if (!user || !token) {
    return <Auth onLogin={handleLogin} />;
  }

  return <WorkoutLog user={user} token={token} onLogout={handleLogout} />;
}

export default App;

