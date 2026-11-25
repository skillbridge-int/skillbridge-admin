'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase, BASE, ROLE_LABEL, VERSION } from '../lib/supabase';

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
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  posts: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12',
  family: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 12a2.5 2.5 0 1 0 0-5M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M17 14a4 4 0 0 1 4 4v2',
};
export const Icon = ({ name, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name] || ICONS.dashboard} />
  </svg>
);

const NAV = {
  admin: [['/', 'Dashboard', 'dashboard'], ['/students', 'Students', 'students'], ['/classes', 'Classes', 'classes'], ['/sessions', 'Sessions', 'sessions'], ['/log', 'Log a session', 'log'], ['/posts', 'Tasks & news', 'posts'], ['/families', 'Family access', 'family'], ['/payments', 'Payments', 'payments'], ['/orders', 'Website orders', 'payments'], ['/catalog', 'Website catalog', 'classes'], ['/teachers', 'Teacher pay', 'teachers'], ['/settings', 'Settings', 'settings']],
  accountant: [['/', 'Dashboard', 'dashboard'], ['/students', 'Students', 'students'], ['/payments', 'Payments', 'payments'], ['/orders', 'Website orders', 'payments'], ['/teachers', 'Teacher pay', 'teachers']],
  coordinator: [['/students', 'Students', 'students'], ['/classes', 'Classes', 'classes'], ['/sessions', 'Sessions', 'sessions'], ['/log', 'Log a session', 'log'], ['/posts', 'Tasks & news', 'posts'], ['/families', 'Family access', 'family']],
  teacher: [['/teacher', 'My overview', 'home'], ['/log', 'Log a session', 'log'], ['/posts', 'Tasks & news', 'posts'], ['/sessions', 'My sessions', 'sessions']],
  parent: [['/parent', 'My learning', 'home']],
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
      const a = { id: u.id, role: prof.role, name: prof.full_name || u.email, teacherId: prof.teacher_id, email: u.email };
      setAuth(a);
      if (roles && !roles.includes(a.role)) return router.replace(HOME[a.role] || '/');
      setState('ok');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, (roles || []).join(',')]);

  const out = async () => { await supabase.auth.signOut(); router.replace('/login/'); };

  if (state === 'checking') return <div className="center muted"><div className="spinner" /></div>;
  if (state === 'denied') return <ClaimCode onSignOut={out} />;

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
          <small className="ver">v{VERSION}</small>
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

function ClaimCode({ onSignOut }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc('claim_invite', { p_code: code, p_name: name });
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: `Linked to ${data}. Opening…` });
    setTimeout(() => { window.location.href = `${BASE}/parent/`; }, 700);
  };
  return (
    <div className="center">
      <form className="card narrow" onSubmit={go}>
        <h2>Welcome</h2>
        <p className="muted">Enter the invite code you received from SkillBridge to see your classes and tasks. Staff: ask the administrator to give you a role.</p>
        <Msg msg={msg} />
        <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label style={{ marginTop: 10 }}>Invite code<input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" /></label>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button disabled={busy}>Continue</button><button type="button" className="ghost" onClick={onSignOut}>Sign out</button></div>
      </form>
    </div>
  );
}
