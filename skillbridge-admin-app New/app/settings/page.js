'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg, useAuth } from '../../components/Shell';
import EditTable from '../../components/EditTable';
import { supabase, nextId, ROLE_LABEL } from '../../lib/supabase';

const ROLES = ['admin'];
const STATUS = ['active', 'completed', 'paused', 'cancelled'];
const TABS = [['teachers', 'Teachers & shares'], ['courses', 'Courses & prices'], ['classes', 'Classes'], ['discounts', 'Discounts & free places'], ['staff', 'Staff & roles']];

function Inner() {
  const me = useAuth();
  const [tab, setTab] = useState('teachers');
  const [msg, setMsg] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [enr, setEnr] = useState([]);
  const [staff, setStaff] = useState([]);
  const [nt, setNt] = useState({ name: '', phone: '', email: '', specialty: '', share: 70 });
  const [nc, setNc] = useState({ name: '', level: '', price: '', sessions: 12, minutes: 60 });
  const [ncl, setNcl] = useState({ id: '', course_id: '', teacher_id: '', start_date: '', share: '' });
  const [ns, setNs] = useState({ email: '', role: 'teacher', name: '', teacher_id: '' });

  const load = useCallback(async () => {
    const [t, c, cl, e, st, s] = await Promise.all([
      supabase.from('teachers').select('*').order('id'),
      supabase.from('courses').select('*').order('id'),
      supabase.from('classes').select('*').order('id'),
      supabase.from('enrollments').select('id,student_id,class_id,discount_pct,status').order('class_id').order('student_id'),
      supabase.rpc('admin_list_staff'),
      supabase.from('students').select('id,name'),
    ]);
    setTeachers(t.data || []); setCourses(c.data || []); setClasses(cl.data || []); setStaff(st.data || []);
    const names = Object.fromEntries((s.data || []).map((x) => [x.id, x.name]));
    setEnr((e.data || []).map((x) => ({ ...x, student: `${x.student_id} · ${names[x.student_id] || ''}` })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const ok = (text) => setMsg({ type: 'ok', text });
  const err = (e) => setMsg({ type: 'err', text: e.message || String(e) });
  const update = (table, keyCol) => async (r, patch) => {
    setMsg(null);
    const { error } = await supabase.from(table).update(patch).eq(keyCol, r[keyCol]);
    if (error) { err(error); return false; }
    ok('Saved. All figures now use the new value.'); load(); return true;
  };
  const insert = async (table, row, after) => {
    setMsg(null);
    const { error } = await supabase.from(table).insert(row);
    if (error) return err(error);
    ok('Added.'); after && after(); load();
  };

  const tOpts = teachers.map((t) => ({ value: t.id, label: `${t.id} · ${t.name}` }));
  const cOpts = courses.map((c) => ({ value: c.id, label: `${c.id} · ${c.name}` }));

  return (
    <>
      <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>)}</div>
      <Msg msg={msg} />

      {tab === 'teachers' && (
        <div className="stack">
          <div className="card"><h2>Teachers</h2>
            <p className="muted" style={{ marginTop: -6 }}>The share is the teacher&apos;s percentage of the revenue of their classes. A single class can override it under <b>Classes</b>.</p>
            <EditTable rows={teachers} onSave={update('teachers', 'id')} columns={[
              { key: 'id', label: 'ID', readOnly: true }, { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' },
              { key: 'specialty', label: 'Specialty' }, { key: 'teacher_share_pct', label: 'Share %', type: 'number' },
              { key: 'status', label: 'Status', type: 'select', options: STATUS }]} />
          </div>
          <form className="card" onSubmit={(e) => { e.preventDefault(); insert('teachers', { id: nextId('T', teachers.map((t) => t.id)), name: nt.name.trim(), phone: nt.phone || null, email: nt.email || null, specialty: nt.specialty || null, teacher_share_pct: Number(nt.share) }, () => setNt({ name: '', phone: '', email: '', specialty: '', share: 70 })); }}>
            <h2>Add a teacher</h2>
            <div className="fields">
              <label>Name<input required value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} /></label>
              <label>Phone<input value={nt.phone} onChange={(e) => setNt({ ...nt, phone: e.target.value })} /></label>
              <label>Email<input type="email" value={nt.email} onChange={(e) => setNt({ ...nt, email: e.target.value })} /></label>
              <label>Specialty<input value={nt.specialty} onChange={(e) => setNt({ ...nt, specialty: e.target.value })} /></label>
              <label>Share %<input type="number" min="0" max="100" value={nt.share} onChange={(e) => setNt({ ...nt, share: e.target.value })} /></label>
            </div>
            <button style={{ marginTop: 14 }}>Add teacher</button>
          </form>
        </div>
      )}

      {tab === 'courses' && (
        <div className="stack">
          <div className="card"><h2>Courses</h2>
            <p className="muted" style={{ marginTop: -6 }}>Changing a price changes every class of that course, including finished ones. For a new price, add a new course (like CRS-005).</p>
            <EditTable rows={courses} onSave={update('courses', 'id')} columns={[
              { key: 'id', label: 'ID', readOnly: true }, { key: 'name', label: 'Name' }, { key: 'level', label: 'Level' },
              { key: 'total_price', label: 'Price (LYD)', type: 'number' }, { key: 'total_sessions', label: 'Sessions', type: 'number' },
              { key: 'session_minutes', label: 'Minutes', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: STATUS }]} />
          </div>
          <form className="card" onSubmit={(e) => { e.preventDefault(); insert('courses', { id: nextId('CRS', courses.map((c) => c.id)), name: nc.name.trim(), level: nc.level || null, total_price: Number(nc.price), total_sessions: Number(nc.sessions), session_minutes: Number(nc.minutes) }, () => setNc({ name: '', level: '', price: '', sessions: 12, minutes: 60 })); }}>
            <h2>Add a course</h2>
            <div className="fields">
              <label>Name<input required value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></label>
              <label>Level<input value={nc.level} onChange={(e) => setNc({ ...nc, level: e.target.value })} /></label>
              <label>Price per student (LYD)<input type="number" min="0" step="any" required value={nc.price} onChange={(e) => setNc({ ...nc, price: e.target.value })} /></label>
              <label>Sessions<input type="number" min="1" required value={nc.sessions} onChange={(e) => setNc({ ...nc, sessions: e.target.value })} /></label>
              <label>Minutes per session<input type="number" min="1" required value={nc.minutes} onChange={(e) => setNc({ ...nc, minutes: e.target.value })} /></label>
            </div>
            <button style={{ marginTop: 14 }}>Add course</button>
          </form>
        </div>
      )}

      {tab === 'classes' && (
        <div className="stack">
          <div className="card"><h2>Classes</h2>
            <p className="muted" style={{ marginTop: -6 }}>Leave <b>Share override</b> empty to use the teacher&apos;s normal share. Set it (for example 100) to change the share for this class only.</p>
            <EditTable rows={classes} onSave={update('classes', 'id')} columns={[
              { key: 'id', label: 'Class', readOnly: true }, { key: 'course_id', label: 'Course', readOnly: true },
              { key: 'teacher_id', label: 'Teacher', type: 'select', options: tOpts },
              { key: 'teacher_share_pct', label: 'Share override %', type: 'number', placeholder: 'default' },
              { key: 'start_date', label: 'Start', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: STATUS }]} />
          </div>
          <form className="card" onSubmit={(e) => { e.preventDefault(); const c = courses.find((x) => x.id === ncl.course_id); insert('classes', { id: ncl.id.trim().toUpperCase(), name: c?.name, course_id: ncl.course_id, teacher_id: ncl.teacher_id, start_date: ncl.start_date || null, teacher_share_pct: ncl.share === '' ? null : Number(ncl.share) }, () => setNcl({ id: '', course_id: '', teacher_id: '', start_date: '', share: '' })); }}>
            <h2>Add a class</h2>
            <div className="fields">
              <label>Class ID (e.g. SBI-ENG-AD-G03)<input required value={ncl.id} onChange={(e) => setNcl({ ...ncl, id: e.target.value })} /></label>
              <label>Course<select required value={ncl.course_id} onChange={(e) => setNcl({ ...ncl, course_id: e.target.value })}><option value="">—</option>{cOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label>Teacher<select required value={ncl.teacher_id} onChange={(e) => setNcl({ ...ncl, teacher_id: e.target.value })}><option value="">—</option>{tOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label>Start date<input type="date" value={ncl.start_date} onChange={(e) => setNcl({ ...ncl, start_date: e.target.value })} /></label>
              <label>Share override % (optional)<input type="number" min="0" max="100" value={ncl.share} onChange={(e) => setNcl({ ...ncl, share: e.target.value })} /></label>
            </div>
            <button style={{ marginTop: 14 }}>Add class</button>
          </form>
        </div>
      )}

      {tab === 'discounts' && (
        <div className="card"><h2>Discounts and free places</h2>
          <p className="muted" style={{ marginTop: -6 }}>Discount % reduces what the student owes. <b>100 = free place</b>: the student pays nothing and earns nothing for the teacher or the center.</p>
          <EditTable rows={enr} onSave={update('enrollments', 'id')} columns={[
            { key: 'student', label: 'Student', readOnly: true }, { key: 'class_id', label: 'Class', readOnly: true },
            { key: 'discount_pct', label: 'Discount %', type: 'number' }, { key: 'status', label: 'Enrollment', type: 'select', options: STATUS }]} />
        </div>
      )}

      {tab === 'staff' && (
        <div className="stack">
          <div className="card"><h2>People with access</h2>
            <div className="scroll"><table>
              <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Teacher</th><th /></tr></thead>
              <tbody>{staff.map((s) => (
                <tr key={s.profile_id}><td>{s.email}</td><td>{s.full_name}</td><td><span className="pill active">{ROLE_LABEL[s.role] || s.role}</span></td><td>{s.teacher_id}</td>
                  <td>{s.email !== me.email && <button className="small danger" onClick={async () => { if (!confirm(`Remove access for ${s.email}?`)) return; const { error } = await supabase.rpc('admin_remove_role', { p_id: s.profile_id }); error ? err(error) : (ok('Access removed.'), load()); }}>Remove</button>}</td></tr>))}</tbody>
            </table></div>
          </div>
          <form className="card" onSubmit={async (e) => { e.preventDefault(); setMsg(null); const { error } = await supabase.rpc('admin_set_role', { p_email: ns.email, p_role: ns.role, p_name: ns.name, p_teacher_id: ns.role === 'teacher' ? ns.teacher_id : null }); if (error) return err(error); ok('Role saved.'); setNs({ email: '', role: 'teacher', name: '', teacher_id: '' }); load(); }}>
            <h2>Give someone a role</h2>
            <ol className="muted" style={{ marginTop: -4, paddingLeft: 18 }}>
              <li>Create their login in Supabase: <b>Authentication → Users → Add user</b> (email + password, tick <b>Auto Confirm User</b>).</li>
              <li>Come back here, type the same email and choose the role.</li>
            </ol>
            <div className="fields">
              <label>Email<input type="email" required value={ns.email} onChange={(e) => setNs({ ...ns, email: e.target.value })} /></label>
              <label>Full name<input value={ns.name} onChange={(e) => setNs({ ...ns, name: e.target.value })} /></label>
              <label>Role
                <select value={ns.role} onChange={(e) => setNs({ ...ns, role: e.target.value })}>
                  {['admin', 'accountant', 'coordinator', 'teacher', 'parent'].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
              {ns.role === 'teacher' && <label>Which teacher<select required value={ns.teacher_id} onChange={(e) => setNs({ ...ns, teacher_id: e.target.value })}><option value="">—</option>{tOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
            </div>
            <button style={{ marginTop: 14 }}>Save role</button>
            <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>
              <b>Admin</b>: everything. <b>Accountant</b>: sees everything, records payments and teacher payouts. <b>Coordinator</b>: manages students, classes and sessions, but sees no money. <b>Teacher</b>: only their own classes, session reports and fees.
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default function Settings() {
  return (
    <Shell title="Settings" subtitle="Change prices, shares, discounts and who can do what" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
