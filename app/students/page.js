'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg, useAuth } from '../../components/Shell';
import { supabase, money, nextId, today } from '../../lib/supabase';

const ROLES = ['admin', 'accountant', 'coordinator'];

function Inner() {
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'coordinator';
  const showMoney = role === 'admin' || role === 'accountant';
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('active');
  const [f, setF] = useState({ name: '', phone: '', age: '', guardian_name: '', class_id: '', discount: 0 });
  const [en, setEn] = useState({ student_id: '', class_id: '', discount: 0 });

  const load = useCallback(async () => {
    const [s, e, fin, att, c] = await Promise.all([
      supabase.from('students').select('*').order('id'),
      supabase.from('enrollments').select('student_id,class_id,discount_pct,status'),
      showMoney ? supabase.from('v_enrollment_finance').select('*') : Promise.resolve({ data: [] }),
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
      for (const x of ens) out.push({ ...st, class_id: x.class_id, enr: x.status, discount: x.discount_pct, fin: finM[key(x)], att: attM[key(x)] });
    }
    setRows(out);
  }, [showMoney]);
  useEffect(() => { load(); }, [load]);

  const addStudent = async (ev) => {
    ev.preventDefault(); setMsg(null);
    const id = nextId('S', students.map((s) => s.id));
    const { error } = await supabase.from('students').insert({
      id, name: f.name.trim(), phone: f.phone || null, age: f.age ? Number(f.age) : null,
      guardian_name: f.guardian_name || null, registered_on: today(),
    });
    if (error) return setMsg({ type: 'err', text: error.message });
    if (f.class_id) {
      const r = await supabase.from('enrollments').insert({ student_id: id, class_id: f.class_id, discount_pct: Number(f.discount) || 0, enrolled_on: today() });
      if (r.error) return setMsg({ type: 'err', text: `Student ${id} saved, but enrollment failed: ${r.error.message}` });
    }
    setMsg({ type: 'ok', text: `Student ${id} added.` });
    setF({ name: '', phone: '', age: '', guardian_name: '', class_id: '', discount: 0 });
    load();
  };

  const enroll = async (ev) => {
    ev.preventDefault(); setMsg(null);
    const { error } = await supabase.from('enrollments').insert({ student_id: en.student_id, class_id: en.class_id, discount_pct: Number(en.discount) || 0, enrolled_on: today() });
    if (error) return setMsg({ type: 'err', text: error.message.includes('duplicate') ? 'This student is already enrolled in that class.' : error.message });
    setMsg({ type: 'ok', text: 'Enrollment added.' });
    setEn({ student_id: '', class_id: '', discount: 0 });
    load();
  };

  const shown = rows.filter((r) => (tab === 'all' || (tab === 'active' ? r.status === 'active' : r.status !== 'active'))
    && (r.id + r.name + r.class_id).toLowerCase().includes(q.toLowerCase()));
  const nActive = new Set(rows.filter((r) => r.status === 'active').map((r) => r.id)).size;
  const nDone = new Set(rows.filter((r) => r.status !== 'active').map((r) => r.id)).size;
  const openClasses = classes.filter((c) => c.status === 'active');

  return (
    <>
      <Msg msg={msg} />
      {canEdit && (
        <div className="two">
          <form className="card" onSubmit={addStudent}>
            <h2>New student</h2>
            <div className="fields">
              <label>Name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label>Phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
              <label>Age<input type="number" min="3" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} /></label>
              <label>Guardian<input value={f.guardian_name} onChange={(e) => setF({ ...f, guardian_name: e.target.value })} /></label>
              <label>Class (optional)
                <select value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
                  <option value="">—</option>{openClasses.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
                </select></label>
              {role === 'admin' && <label>Discount % (100 = free)<input type="number" min="0" max="100" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} /></label>}
            </div>
            <button style={{ marginTop: 14 }}>Add student</button>
          </form>
          <form className="card" onSubmit={enroll}>
            <h2>Enroll an existing student in another class</h2>
            <div className="fields">
              <label>Student
                <select required value={en.student_id} onChange={(e) => setEn({ ...en, student_id: e.target.value })}>
                  <option value="">—</option>{students.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}
                </select></label>
              <label>Class
                <select required value={en.class_id} onChange={(e) => setEn({ ...en, class_id: e.target.value })}>
                  <option value="">—</option>{openClasses.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
                </select></label>
              {role === 'admin' && <label>Discount % (100 = free)<input type="number" min="0" max="100" value={en.discount} onChange={(e) => setEn({ ...en, discount: e.target.value })} /></label>}
            </div>
            <button style={{ marginTop: 14 }}>Enroll</button>
          </form>
        </div>
      )}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tabs" style={{ margin: 0 }}>
            <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Active ({nActive})</button>
            <button className={tab === 'completed' ? 'on' : ''} onClick={() => setTab('completed')}>Completed ({nDone})</button>
            <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All</button>
          </div>
          <input placeholder="Search name, ID or class…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="scroll"><table>
          <thead><tr><th>ID</th><th>Name</th><th>Student</th><th>Class</th><th>Enrollment</th>
            {showMoney && <><th className="right">Net fee</th><th className="right">Paid</th><th className="right">Balance</th><th>Payment</th></>}
            <th>Attendance</th></tr></thead>
          <tbody>{shown.map((r, i) => (
            <tr key={r.id + r.class_id + i}>
              <td>{r.id}</td><td>{r.name}</td><td><span className={`pill ${r.status}`}>{r.status}</span></td><td>{r.class_id}</td>
              <td>{r.enr && <span className={`pill ${r.enr}`}>{r.enr}</span>}</td>
              {showMoney && <>
                <td className="right">{r.fin ? money(r.fin.net_fee) : '—'}</td>
                <td className="right">{r.fin ? money(r.fin.paid) : '—'}</td>
                <td className="right">{r.fin ? (Number(r.fin.balance) < 0 ? `${money(r.fin.balance)} (credit)` : money(r.fin.balance)) : '—'}</td>
                <td>{r.fin ? <span className={`pill ${r.fin.payment_status}`}>{Number(r.discount) === 100 ? 'free' : r.fin.payment_status}</span> : ''}</td>
              </>}
              <td>{r.att ? `${r.att.attended} present · ${r.att.absences} absent` : ''}</td>
            </tr>))}</tbody>
        </table></div>
      </div>
    </>
  );
}

export default function Students() {
  return (
    <Shell title="Students" subtitle="Active students are those in a class that is still running" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
