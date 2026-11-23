'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg } from '../../components/Shell';
import { supabase, money, nextId } from '../../lib/supabase';

export default function Students() {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ name: '', phone: '', age: '', guardian_name: '', class_id: '', discount: 0 });
  const [en, setEn] = useState({ student_id: '', class_id: '', discount: 0 });

  const load = useCallback(async () => {
    const [s, e, fin, att, c] = await Promise.all([
      supabase.from('students').select('*').order('id'),
      supabase.from('enrollments').select('student_id,class_id,discount_pct,status'),
      supabase.from('v_enrollment_finance').select('*'),
      supabase.from('v_student_attendance').select('*'),
      supabase.from('classes').select('id,name,status').order('id'),
    ]);
    setStudents(s.data || []); setClasses(c.data || []);
    const key = (x) => x.student_id + '|' + x.class_id;
    const finM = Object.fromEntries((fin.data || []).map((x) => [key(x), x]));
    const attM = Object.fromEntries((att.data || []).map((x) => [key(x), x]));
    const out = [];
    for (const st of s.data || []) {
      const ens = (e.data || []).filter((x) => x.student_id === st.id);
      if (ens.length === 0) out.push({ ...st, class_id: '—' });
      for (const x of ens) out.push({ ...st, class_id: x.class_id, discount: x.discount_pct, fin: finM[key(x)], att: attM[key(x)] });
    }
    setRows(out);
  }, []);
  useEffect(() => { load(); }, [load]);

  const addStudent = async (ev) => {
    ev.preventDefault(); setMsg(null);
    const id = nextId('S', students.map((s) => s.id));
    const { error } = await supabase.from('students').insert({
      id, name: f.name.trim(), phone: f.phone || null, age: f.age ? Number(f.age) : null,
      guardian_name: f.guardian_name || null, registered_on: new Date().toISOString().slice(0, 10),
    });
    if (error) return setMsg({ type: 'err', text: error.message });
    if (f.class_id) {
      const r = await supabase.from('enrollments').insert({ student_id: id, class_id: f.class_id, discount_pct: Number(f.discount) || 0, enrolled_on: new Date().toISOString().slice(0, 10) });
      if (r.error) return setMsg({ type: 'err', text: `Student ${id} saved, but enrollment failed: ${r.error.message}` });
    }
    setMsg({ type: 'ok', text: `Student ${id} added.` });
    setF({ name: '', phone: '', age: '', guardian_name: '', class_id: '', discount: 0 });
    load();
  };

  const enroll = async (ev) => {
    ev.preventDefault(); setMsg(null);
    const { error } = await supabase.from('enrollments').insert({ student_id: en.student_id, class_id: en.class_id, discount_pct: Number(en.discount) || 0, enrolled_on: new Date().toISOString().slice(0, 10) });
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: 'Enrollment added.' });
    setEn({ student_id: '', class_id: '', discount: 0 });
    load();
  };

  const shown = rows.filter((r) => (r.id + r.name + r.class_id).toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell title="Students">
      <Msg msg={msg} />
      <div className="two" style={{ marginBottom: 16 }}>
        <form className="card" onSubmit={addStudent}>
          <h2>New student</h2>
          <div className="row" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            <label>Name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label>Phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
            <label>Age<input type="number" min="3" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} /></label>
            <label>Guardian<input value={f.guardian_name} onChange={(e) => setF({ ...f, guardian_name: e.target.value })} /></label>
            <label>Class (optional)
              <select value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
                <option value="">—</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select></label>
            <label>Discount %<input type="number" min="0" max="100" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} /></label>
          </div>
          <button style={{ marginTop: 12 }}>Add student</button>
        </form>
        <form className="card" onSubmit={enroll}>
          <h2>Enroll an existing student in a class</h2>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            <label>Student
              <select required value={en.student_id} onChange={(e) => setEn({ ...en, student_id: e.target.value })}>
                <option value="">—</option>{students.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}
              </select></label>
            <label>Class
              <select required value={en.class_id} onChange={(e) => setEn({ ...en, class_id: e.target.value })}>
                <option value="">—</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select></label>
            <label>Discount %<input type="number" min="0" max="100" value={en.discount} onChange={(e) => setEn({ ...en, discount: e.target.value })} /></label>
          </div>
          <button style={{ marginTop: 12 }}>Enroll</button>
        </form>
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>All enrollments ({shown.length})</h2>
          <input placeholder="Search name, ID or class…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="scroll"><table>
          <thead><tr><th>ID</th><th>Name</th><th>Class</th><th className="right">Net fee</th><th className="right">Paid</th><th className="right">Balance</th><th>Status</th><th>Attendance</th></tr></thead>
          <tbody>{shown.map((r, i) => (
            <tr key={r.id + r.class_id + i}>
              <td>{r.id}</td><td>{r.name}</td><td>{r.class_id}</td>
              <td className="right">{r.fin ? money(r.fin.net_fee) : '—'}</td>
              <td className="right">{r.fin ? money(r.fin.paid) : '—'}</td>
              <td className="right">{r.fin ? money(r.fin.balance) : '—'}</td>
              <td>{r.fin ? <span className={`pill ${r.fin.payment_status}`}>{r.fin.payment_status}</span> : ''}</td>
              <td>{r.att ? `${r.att.attended} present · ${r.att.absences} absent` : ''}</td>
            </tr>))}</tbody>
        </table></div>
      </div>
    </Shell>
  );
}
