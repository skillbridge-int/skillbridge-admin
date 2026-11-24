'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, BASE } from '../../lib/supabase';

const HOME = { admin: '/', accountant: '/', coordinator: '/students', teacher: '/teacher', parent: '/parent' };

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); return setErr('Wrong email or password.'); }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    setBusy(false);
    router.replace(HOME[prof?.role] || '/');
  };

  return (
    <div className="loginbg">
      <form className="logincard" onSubmit={submit}>
        <img className="logobig" src={`${BASE}/logo.png`} alt="SkillBridge International" />
        <h1>SkillBridge International</h1>
        <p className="muted">Sign in to continue</p>
        {err && <div className="msg err">{err}</div>}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label style={{ marginTop: 12 }}>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button style={{ marginTop: 18, width: '100%' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted" style={{ textAlign: 'center', marginTop: 14 }}>Student or parent with an invite code? <Link href="/register/">Create your account</Link></p>
      </form>
    </div>
  );
}
