'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr('Wrong email or password.');
    router.replace('/');
  };

  return (
    <div className="center">
      <form className="card narrow" onSubmit={submit}>
        <div className="brand" style={{ marginBottom: 16 }}><span className="logo">SB</span><div><b>SkillBridge International</b><small>Admin sign in</small></div></div>
        {err && <div className="msg err">{err}</div>}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label style={{ marginTop: 10 }}>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button style={{ marginTop: 14, width: '100%' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
