'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase, BASE, ROLE_LABEL } from '../lib/supabase';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// icon paths (24x24, stroke)
const ICONS = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  students: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  classes: 'M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M4 19a2 2 0 0 0 2 2h12M8 7h8M8 11h8M8 15h5',
  payments: 'M2 7h20v12H2zM2 11h20M6 15h4',
  teachers: 'M12 3 2 8l10 5 10-5-10-5zM6 10.5V15c0 1.5 3 3 6 3s6-1.5 6-3v-4.5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  log: 'M12 5v14M5 12h14',
  sessions: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
};
export const Icon = ({ name, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name] || ICONS.dashboard} />
  </svg>
);

const NAV = {
  admin: [['/', 'Dashboard', 'dashboard'], ['/students', 'Students', 'students'], ['/classes', 'Classes', 'classes'], ['/sessions', 'Sessions', 'sessions'], ['/log', 'Log a session', 'log'], ['/payments', 'Payments', 'payments'], ['/teachers', 'Teacher pay', 'teachers'], ['/settings', 'Settings', 'settings']],
  accountant: [['/', 'Dashboard', 'dashboard'], ['/students', 'Students', 'students'], ['/payments', 'Payments', 'payments'], ['/teachers', 'Teacher pay', 'teachers']],
  coordinator: [['/students', 'Students', 'students'], ['/classes', 'Classes', 'classes'], ['/sessions', 'Sessions', 'sessions'], ['/log', 'Log a session', 'log']],
  teacher: [['/teacher', 'My overview', 'home'], ['/log', 'Log a session', 'log'], ['/sessions', 'My sessions', 'sessions']],
  parent: [['/parent', 'My children', 'home']],
};
const HOME = { admin: '/', accountant: '/', coordinator: '/students', teacher: '/teacher', parent: '/parent' };

export default function Shell({ title, subtitle, roles, children }) {
  const router = useRouter();
  const path = usePathname() || '/';
  const [auth, setAuth] = useState(null);       // { role, name, teacherId, email }
  const [state, setState] = useState('checking'); // checking | ok | denied

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/login/');
      const u = data.session.user;
      const { data: prof } = await supabase.from('profiles').select('role,full_name,teacher_id').eq('id', u.id).maybeSingle();
      if (!prof) return setState('denied');
      const a = { role: prof.role, name: prof.full_name || u.email, teacherId: prof.teacher_id, email: u.email };
      setAuth(a);
      if (roles && !roles.includes(a.role)) return router.replace(HOME[a.role] || '/');
      setState('ok');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, (roles || []).join(',')]);

  const out = async () => { await supabase.auth.signOut(); router.replace('/login/'); };

  if (state === 'checking') return <div className="center muted"><div className="spinner" /></div>;
  if (state === 'denied')
    return (
      <div className="center">
        <div className="card narrow">
          <h2>No access yet</h2>
          <p className="muted">Your login exists but has no role. Ask the administrator to give you a role in Settings.</p>
          <button onClick={out}>Sign out</button>
        </div>
      </div>
    );

  const nav = NAV[auth.role] || [];
  const isActive = (href) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <Ctx.Provider value={auth}>
      <div className="layout">
        <aside className="side">
          <div className="brand">
            <img src={`${BASE}/logo-mark.png`} alt="SkillBridge International" className="logo" />
            <div><b>SkillBridge</b><small>International</small></div>
          </div>
          <nav>
            {nav.map(([href, label, icon]) => (
              <Link key={href} href={href} className={isActive(href) ? 'active' : ''}><Icon name={icon} /><span>{label}</span></Link>
            ))}
          </nav>
          <div className="who">
            <div className="avatar">{String(auth.name || '?').trim().charAt(0).toUpperCase()}</div>
            <div className="whoText"><b>{auth.name}</b><small>{ROLE_LABEL[auth.role] || auth.role}</small></div>
            <button className="ghost small" onClick={out} title="Sign out">Sign out</button>
          </div>
        </aside>
        <main className="main">
          <header className="pagehead">
            <h1>{title}</h1>
            {subtitle && <p className="muted">{subtitle}</p>}
          </header>
          {children}
        </main>
      </div>
    </Ctx.Provider>
  );
}

export function Msg({ msg }) {
  if (!msg) return null;
  return <div className={`msg ${msg.type}`}>{msg.text}</div>;
}

export function Kpi({ label, value, tone = '', icon, hint }) {
  return (
    <div className={`card kpi ${tone}`}>
      {icon && <span className="kicon"><Icon name={icon} size={18} /></span>}
      <small>{label}</small>
      <b>{value}</b>
      {hint && <em>{hint}</em>}
    </div>
  );
}
