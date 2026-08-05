import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

/* ═══════════════════════════════════════════════════════════════
   开发者模式 — 隐藏入口：导航栏底部"808-Stars"双击 + 密钥
   - 密钥：jxwkj888
   - 持久化：localStorage('oto-dev-mode-${username}')  ——  'on' / 'off'
   - 日期穿越：localStorage('oto-dev-fake-date-${username}')  ——  'YYYY-MM-DD' or 缺省
   - 每个账号独立，互不影响
   ═══════════════════════════════════════════════════════════════ */

export const DEV_KEY = 'jxwkj888';

function storageKey(username: string, suffix: string): string {
  return `oto-${suffix}-${username || '_anon'}`;
}

interface DevModeContextValue {
  isDev: boolean;
  fakeDate: string | null;          // 'YYYY-MM-DD' or null
  setFakeDate: (d: string | null) => void;
  unlock: (key: string) => boolean;  // 输入密钥，匹配则解锁
  lock: () => void;                   // 手动关闭（同时清 fake date）
}

const DevModeContext = createContext<DevModeContextValue>({
  isDev: false,
  fakeDate: null,
  setFakeDate: () => {},
  unlock: () => false,
  lock: () => {},
});

function readFakeDate(username: string): string | null {
  try {
    const v = localStorage.getItem(storageKey(username, 'dev-fake-date'));
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  } catch { /* 隐私模式 */ }
  return null;
}

export function DevModeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const username = user?.email || null;
  const prevUsernameRef = useRef<string | null>(null);

  // 等 auth 加载完再初始化，避免用 '_anon' 读到错误的 dev mode 状态
  const [isDev, setIsDev] = useState<boolean>(false);
  const [fakeDate, setFakeDateState] = useState<string | null>(null);

  // auth 加载完成 或 账号切换 时，读取该账号的 dev mode 状态
  useEffect(() => {
    if (loading) return; // 等 auth 完成
    if (prevUsernameRef.current === username) return; // 无变化跳过
    prevUsernameRef.current = username;
    if (!username) { setIsDev(false); setFakeDateState(null); return; }
    try {
      const devOn = localStorage.getItem(storageKey(username, 'dev-mode')) === 'on';
      setIsDev(devOn);
      setFakeDateState(devOn ? readFakeDate(username) : null);
    } catch { /* */ }
  }, [username, loading]);

  useEffect(() => {
    if (loading || !username) return; // auth 未完成时不写入
    try { localStorage.setItem(storageKey(username, 'dev-mode'), isDev ? 'on' : 'off'); }
    catch { /* 隐私模式或存储不可用时静默 */ }
  }, [isDev, username, loading]);

  useEffect(() => {
    if (loading || !username) return;
    try {
      if (isDev && fakeDate) localStorage.setItem(storageKey(username, 'dev-fake-date'), fakeDate);
      else localStorage.removeItem(storageKey(username, 'dev-fake-date'));
    } catch { /* */ }
  }, [isDev, fakeDate, username, loading]);

  const setFakeDate = useCallback((d: string | null) => {
    setFakeDateState(d);
    setTimeout(() => { window.location.reload(); }, 50);
  }, []);

  const unlock = useCallback((key: string) => {
    if (key === DEV_KEY) { setIsDev(true); return true; }
    return false;
  }, []);

  const lock = useCallback(() => {
    setIsDev(false);
    setFakeDateState(null);
    // Use the current username from state instead of localStorage
    const u = username || '_anon';
    try { localStorage.removeItem(storageKey(u, 'dev-fake-date')); } catch { /* */ }
    try { localStorage.removeItem(storageKey(u, 'dev-mode')); } catch { /* */ }
    setTimeout(() => { window.location.reload(); }, 50);
  }, [username]);

  return (
    <DevModeContext.Provider value={{ isDev, fakeDate, setFakeDate, unlock, lock }}>
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  return useContext(DevModeContext);
}

/* ── fake-date hooks（fakeDate + 真实时分秒） ── */

export function useFakeDate(): Date {
  const { fakeDate, isDev } = useDevMode();
  if (isDev && fakeDate) {
    const [y, m, d] = fakeDate.split('-').map(Number);
    const real = new Date();
    real.setFullYear(y, m - 1, d);
    return real;
  }
  return new Date();
}

export function useFakeNow(): Date {
  return useFakeDate();
}
