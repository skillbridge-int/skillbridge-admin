'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg, useAuth } from '../../components/Shell';
import { supabase, BASE } from '../../lib/supabase';

const ROLES = ['admin', 'coordinator'];

function Inner() {
  const me = useAuth();
  const [students, setStudents] = useState([]);
  const [codes, setCodes] = useState([]);
  const [logins, setLogins] = useState([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const [s, c, l] = await Promise.all([
      supabase.from('students').select('id,name,status').order('id'),
      supabase.from('invite_codes').select('*').eq('active', true),
      supabase.rpc('admin_family_logins'),
    ]);
    setStudents(s.data || []); setCodes(c.data || []); setLogins(l.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const site = () => (typeof window !== 'undefined' ? `${window.location.origin}${BASE}/register/` : '');
  const make = async (id, fresh) => {
    setMsg(null);
    if (fresh && !confirm('Make a new code? The old code stops working (people already linked stay linked).')) return;
    const { error } = await supabase.rpc('admin_make_invite', { p_student: id, p_new: !!fresh });
    if (error) return setMsg({ type: 'err', text: error.message });
    load();
  };
  const copy = async (st, code) => {
    const text = `Hello! To follow ${st.name}'s classes, tasks and announcements at SkillBridge International:\n1. Open ${site()}\n2. Create your account with this invite code: ${code}\n`;
    try { await navigator.clipboard.writeText(text); setMsg({ type: 'ok', text: 'Message copied. Paste it into WhatsApp or SMS.' }); } catch { prompt('Copy this message:', text); }
  };
  const unlink = async (l) => {
    if (!confirm(`Remove ${l.email}'s access to ${l.student_name}?`)) return;
    const { error } = await supabase.from('guardian_students').delete().eq('profile_id', l.profile_id).eq('student_id', l.student_id);
    if (error) return setMsg({ type: 'err', text: error.message });
    load();
  };

  const shown = students.filter((s) => (s.id + s.name).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Msg msg={msg} />
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>Give each student (or parent) an invite code. They open the registration page, create their own login and enter the code. One code can be used by up to 3 logins, for example both parents. For Kids classes, give the code to the parent.</p>
        <input placeholder="Search student…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
      </div>
      <div className="card"><div className="scroll"><table>
        <thead><tr><th>ID</th><th>Student</th><th>Invite code</th><th>Logins linked</th><th /></tr></thead>
        <tbody>{shown.map((s) => {
          const c = codes.find((x) => x.student_id === s.id);
          const ls = logins.filter((l) => l.student_id === s.id);
          return (
            <tr key={s.id}>
              <td>{s.id}</td><td>{s.name}</td>
              <td>{c ? <><span className="codebox">{c.code}</span> <small className="muted">{c.uses}/{c.max_uses} used</small></> : <span className="muted">—</span>}</td>
              <td>{ls.length === 0 ? <span className="muted">none yet</span> : ls.map((l) => (
                <div key={l.profile_id}>{l.full_name || l.email} <small className="muted">{l.email}</small>{me.role === 'admin' && <> <button className="small danger" onClick={() => unlink(l)}>Remove</button></>}</div>))}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {!c && <button className="small" onClick={() => make(s.id)}>Create code</button>}
                {c && <><button className="small" onClick={() => copy(s, c.code)}>Copy message</button> <button className="small ghost" onClick={() => make(s.id, true)}>New code</button></>}
              </td>
            </tr>
          );
        })}</tbody>
      </table></div></div>
    </>
  );
}

export default function Families() {
  return (
    <Shell title="Family access" subtitle="Invite students and parents to see classes, tasks and announcements" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
