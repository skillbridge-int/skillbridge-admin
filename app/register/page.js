'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, BASE } from '../../lib/supabase';

export default function Register() {
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', password: '', code: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (f.password.length < 8) { setBusy(false); return setMsg({ type: 'err', text: 'Use a password of at least 8 characters.' }); }
    const { data, error } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password });
    if (error) { setBusy(false); return setMsg({ type: 'err', text: error.message }); }
    if (!data.session) {   // e-mail confirmation is switched on in Supabase
      setBusy(false);
      return setMsg({ type: 'ok', text: 'Account created. Open the confirmation e-mail we sent you, then sign in and enter your invite code.' });
    }
    const { error: e2 } = await supabase.rpc('claim_invite', { p_code: f.code, p_name: f.name });
    setBusy(false);
    if (e2) return setMsg({ type: 'err', text: e2.message + ' Your login was created: sign in and enter the code again.' });
    router.replace('/parent/');
  };

  return (
    <div className="loginbg">
      <form className="logincard" onSubmit={submit}>
        <img className="logobig" src={`${BASE}/logo.png`} alt="SkillBridge International" />
        <h1>Create your account</h1>
        <p className="muted">For students and parents. You need the invite code from SkillBridge.</p>
        {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
        <label>Your name<input required value={f.name} onChange={set('name')} /></label>
        <label style={{ marginTop: 12 }}>Email<input type="email" required value={f.email} onChange={set('email')} autoComplete="username" /></label>
        <label style={{ marginTop: 12 }}>Password<input type="password" required value={f.password} onChange={set('password')} autoComplete="new-password" /></label>
        <label style={{ marginTop: 12 }}>Invite code<input required value={f.code} onChange={set('code')} placeholder="XXXX-XXXX" /></label>
        <button style={{ marginTop: 18, width: '100%' }} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted" style={{ textAlign: 'center', marginTop: 14 }}>Already registered? <Link href="/login/">Sign in</Link></p>
      </form>
    </div>
  );
}
