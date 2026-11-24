'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg, useAuth } from '../../components/Shell';
import { supabase, money } from '../../lib/supabase';

const ROLES = ['admin', 'accountant', 'coordinator'];

function Inner() {
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'coordinator';
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState({});
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const [p, t] = await Promise.all([
      supabase.from('v_class_progress').select('*').order('class_id'),
      supabase.from('teachers').select('id,name'),
    ]);
    setRows(p.data || []);
    setTeachers(Object.fromEntries((t.data || []).map((x) => [x.id, x.name])));
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    const { error } = await supabase.from('classes').update({ status }).eq('id', id);
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: status === 'completed' ? `${id} is completed. Its students are now marked completed too.` : `${id} is now ${status}.` });
    load();
  };

  return (
    <>
      <Msg msg={msg} />
      <div className="card"><div className="scroll"><table>
        <thead><tr><th>Class</th><th>Teacher</th><th>Held</th><th>Remaining</th><th>Students</th>{role !== 'coordinator' && <th className="right">Price / session</th>}<th>Progress</th><th>Status</th></tr></thead>
        <tbody>{rows.map((c) => (
          <tr key={c.class_id}>
            <td>{c.class_id}</td><td>{teachers[c.teacher_id]}</td><td>{c.held}/{c.total}</td><td>{c.remaining}</td><td>{c.enrolled}</td>
            {role !== 'coordinator' && <td className="right">{money(c.price_per_session)}</td>}
            <td><span className="bar"><i style={{ width: `${c.progress_pct}%` }} /></span> {c.progress_pct}%</td>
            <td>{canEdit
              ? <select value={c.status} onChange={(e) => setStatus(c.class_id, e.target.value)}>{['active', 'completed', 'paused', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select>
              : <span className={`pill ${c.status}`}>{c.status}</span>}</td>
          </tr>))}</tbody>
      </table></div></div>
    </>
  );
}

export default function Classes() {
  return (
    <Shell title="Classes" subtitle="Marking a class completed also completes its students" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
