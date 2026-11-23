'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg } from '../../components/Shell';
import { supabase, money } from '../../lib/supabase';

export default function Classes() {
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
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: `${id} is now ${status}.` });
    load();
  };

  return (
    <Shell title="Classes">
      <Msg msg={msg} />
      <div className="card"><div className="scroll"><table>
        <thead><tr><th>Class</th><th>Teacher</th><th>Held</th><th>Remaining</th><th>Students</th><th className="right">Price / session</th><th>Progress</th><th>Status</th></tr></thead>
        <tbody>{rows.map((c) => (
          <tr key={c.class_id}>
            <td>{c.class_id}</td><td>{teachers[c.teacher_id]}</td><td>{c.held}/{c.total}</td><td>{c.remaining}</td><td>{c.enrolled}</td>
            <td className="right">{money(c.price_per_session)}</td>
            <td><div className="bar"><i style={{ width: `${c.progress_pct}%` }} /></div> {c.progress_pct}%</td>
            <td><select value={c.status} onChange={(e) => setStatus(c.class_id, e.target.value)}>
              {['active', 'completed', 'paused', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select></td>
          </tr>))}</tbody>
      </table></div></div>
    </Shell>
  );
}
