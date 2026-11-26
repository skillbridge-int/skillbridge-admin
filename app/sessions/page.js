'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg, useAuth } from '../../components/Shell';
import { supabase } from '../../lib/supabase';
import { useClassLabels } from '../../lib/labels';

const ROLES = ['admin', 'coordinator', 'teacher'];

function Inner() {
  const L = useClassLabels();
  const { role } = useAuth();
  const [rows, setRows] = useState([]);
  const [cls, setCls] = useState('');
  const [open, setOpen] = useState(null);

  const [msg, setMsg] = useState(null);
  const load = useCallback(() => {
    (async () => {
      const [s, a] = await Promise.all([
        supabase.from('sessions').select('*').order('session_date', { ascending: false }).order('id', { ascending: false }),
        supabase.from('attendance').select('session_id,student_id,state'),
      ]);
      const by = {};
      for (const x of a.data || []) { by[x.session_id] = by[x.session_id] || { present: 0, absent: 0, excused: 0, list: [] }; by[x.session_id][x.state]++; by[x.session_id].list.push(x); }
      setRows((s.data || []).map((r) => ({ ...r, att: by[r.id] })));
    })();
  }, []);
  useEffect(() => { load(); }, [load]);
  const del = async (r) => {
    if (!confirm(`Delete session ${r.session_no} of ${L(r.class_id)} dated ${r.session_date}? Its attendance is deleted too. This cannot be undone.`)) return;
    const { error } = await supabase.from('sessions').delete().eq('id', r.id);
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: 'Session deleted.' }); setOpen(null); load();
  };

  const classes = [...new Set(rows.map((r) => r.class_id))].sort();
  const shown = rows.filter((r) => !cls || r.class_id === cls);
  const held = shown.filter((r) => r.status === 'held');

  return (
    <>
    <Msg msg={msg} />
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{role === 'teacher' ? 'My sessions' : 'All sessions'} · {held.length} held of {shown.length}</h2>
        <select value={cls} onChange={(e) => setCls(e.target.value)}>
          <option value="">All classes</option>{classes.map((c) => <option key={c} value={c}>{L(c)}</option>)}
        </select>
      </div>
      <div className="scroll"><table>
        <thead><tr><th>Date</th><th>Class</th><th>No.</th><th>Status</th><th>Type</th><th>Min</th><th>Attendance</th><th>Topic</th></tr></thead>
        <tbody>{shown.map((r) => (
          <tr key={r.id} onClick={() => setOpen(open === r.id ? null : r.id)} style={{ cursor: 'pointer' }}>
            <td>{r.session_date}</td><td>{L(r.class_id)}</td><td>{r.session_no}</td>
            <td><span className={`pill ${r.status}`}>{r.status.replaceAll('_', ' ')}</span></td>
            <td>{r.kind}</td><td>{r.duration_min || ''}</td>
            <td>{r.att ? `${r.att.present} present · ${r.att.absent} absent${r.att.excused ? ` · ${r.att.excused} excused` : ''}` : ''}</td>
            <td style={{ whiteSpace: 'normal', maxWidth: 360 }}>{open === r.id ? <>{[r.topic, r.homework && `Homework: ${r.homework}`, r.notes && `Notes: ${r.notes}`].filter(Boolean).join(' — ') || '—'}{role === 'admin' && <div style={{ marginTop: 8 }}><button type="button" className="small danger" onClick={(e) => { e.stopPropagation(); del(r); }}>Delete this session</button></div>}</> : (r.topic || '')}</td>
          </tr>))}</tbody>
      </table></div>
    </div>
    </>
  );
}

export default function Sessions() {
  return (
    <Shell title="Sessions" subtitle="Click a row to see the homework and notes" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
