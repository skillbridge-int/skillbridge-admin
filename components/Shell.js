'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const NAV = [
  ['/', 'Dashboard'],
  ['/students', 'Students'],
  ['/classes', 'Classes'],
  ['/payments', 'Payments'],
  ['/teachers', 'Teachers'],
];

export default function Shell({ title, children }) {
  const router = useRouter();
  const path = usePathname();
  const [state, setState] = useState('checking'); // checking | ok | denied

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/login');
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle();
      if (prof?.role !== 'admin') return setState('denied');
      setState('ok');
    })();
  }, [router]);

  const out = async () => { await supabase.auth.signOut(); router.replace('/login'); };

  if (state === 'checking') return <div className="center muted">Loading…</div>;
  if (state === 'denied')
    return (
      <div className="center">
        <div className="card narrow">
          <h2>No access</h2>
          <p className="muted">This account is not an admin. Teacher and parent portals come in the next phase.</p>
          <button onClick={out}>Sign out</button>
        </div>
      </div>
    );

  return (
    <div className="layout">
      <aside className="side">
        <div className="brand"><span className="logo">SB</span><div><b>SkillBridge</b><small>Admin</small></div></div>
        <nav>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
        <button className="ghost" onClick={out}>Sign out</button>
      </aside>
      <main className="main">
        <header><h1>{title}</h1></header>
        {children}
      </main>
    </div>
  );
}

export function Msg({ msg }) {
  if (!msg) return null;
  return <div className={`msg ${msg.type}`}>{msg.text}</div>;
}
