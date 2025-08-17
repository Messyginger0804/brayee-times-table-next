"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const UserCtx = createContext(null);
export const useUser = () => useContext(UserCtx);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios.get('/api/auth/me', { withCredentials: true })
      .then(r => { if (mounted) setUser(r.data || null); })
      .catch(() => { if (mounted) setUser(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const login = async (name, pin) => {
    const { data } = await axios.post('/api/auth/login', { name, pin }, { withCredentials: true });
    setUser(data);
    return data;
  };

  const register = async (name, pin) => {
    const { data } = await axios.post('/api/auth/register', { name, pin }, { withCredentials: true });
    setUser(data);
    return data;
  };

  const logout = async () => {
    await axios.post('/api/auth/logout', {}, { withCredentials: true });
    setUser(null);
  };

  const updateLevel = async (level) => {
    const { data } = await axios.post('/api/users/level', { level }, { withCredentials: true });
    setUser(prev => ({ ...(prev || {}), ...data }));
    return data;
  };

  return (
    <UserCtx.Provider value={{ user, login, register, logout, loading, updateLevel }}>
      {children}
    </UserCtx.Provider>
  );
}

