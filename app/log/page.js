'use client';
import { useEffect, useState, useMemo } from 'react';
import Shell, { Msg } from '../../components/Shell';
import { supabase, today } from '../../lib/supabase';
import { useClassLabels } from '../../lib/labels';

const ROLES = ['admin', 'coordinator', 'teacher'];
const STATUS = [['held', 'Held'], ['cancelled_by_student', 'Cancelled by student'], ['cancelled_by_teacher', 'Cancelled by teacher'], ['postponed', 'Postponed']];

function Inner() {
  const L = useClassLabels();
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState({});
  const [cid, setCid] = useState('');
  const [roster, setRoster] = useState([]);
  const [existing, setExisting] = useState([]);
  const [att, setAtt] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ date: today(), no: '', duration: 60, status: 'held', kind: 'regular', topic: '', homework: '', notes: '' });

  useEffect(() => {
    (async () => {
      const [c, k] = await Promise.all([
        supabase.from('classes').select('id,course_id,status').eq('status', 'active').order('id'),
        supabase.from('courses').select('id,name,total_sessions,session_minutes'),
      ]);
      setClasses(c.data || []);
      setCourses(Object.fromEntries((k.data || []).map((x) => [x.id, x])));
      if ((c.data || []).length === 1) setCid(c.data[0].id);
    })();
  }, []);

  const loadClass = async (id) => {
    if (!id) { setRoster([]); setExisting([]); return; }
    const [r, s] = await Promise.all([
      supabase.rpc('roster_of', { cid: id }),
      supabase.from('sessions').select('session_no,session_date,status').eq('class_id', id).order('session_no'),
    ]);
    setRoster(r.data || []);
    setExisting(s.data || []);
    setAtt(Object.fromEntries((r.data || []).map((x) => [x.student_id, 'present'])));
    const held = (s.data || []).filter((x) => x.status === 'held').map((x) => x.session_no);
    const cls = classes.find((x) => x.id === id);
    setF((p) => ({ ...p, no: String((held.length ? Math.max(...held) : 0) + 1), duration: courses[cls?.course_id]?.session_minutes || 60 }));
  };
  useEffect(() => { loadClass(cid); /* eslint-disable-next-line */ }, [cid, Object.keys(courses).length]);

  const cls = classes.find((x) => x.id === cid);
  const total = courses[cls?.course_id]?.total_sessions;
  const heldNos = useMemo(() => new Set(existing.filter((x) => x.status === 'held').map((x) => x.session_no)), [existing]);
  const warn = !cid ? null
    : heldNos.has(Number(f.no)) ? `Session ${f.no} is already recorded as held for this class.`
    : f.date > today() ? 'The lesson date cannot be in the future.'
    : total && Number(f.no) > total ? `This course has only ${total} sessions.` : null;

  const submit = async (e) => {
    e.preventDefault(); setMsg(null); setBusy(true);
    const { error } = await supabase.rpc('log_session', {
      p_class: cid, p_no: Number(f.no), p_date: f.date, p_duration: Number(f.duration) || 0, p_status: f.status, p_kind: f.kind,
      p_topic: f.topic, p_homework: f.homework, p_notes: f.notes,
      p_attendance: roster.map((r) => ({ student_id: r.student_id, state: att[r.student_id] || 'present' })),
    });
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: `Session ${f.no} saved. Thank you!` });
    setF((p) => ({ ...p, topic: '', homework: '', notes: '' }));
    loadClass(cid);
  };

  return (
    <>
      <Msg msg={msg} />
      <form className="stack" onSubmit={submit}>
        <div className="card">
          <h2>Lesson details</h2>
          <div className="fields">
            <label>Class
              <select required value={cid} onChange={(e) => setCid(e.target.value)}>
                <option value="">Choose a class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{L(c.id)}</option>)}
              </select></label>
            <label>Lesson date<input type="date" required max={today()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label>Session number{total ? ` (of ${total})` : ''}<input type="number" min="1" required value={f.no} onChange={(e) => setF({ ...f, no: e.target.value })} /></label>
            <label>Status
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            {f.status === 'held' && <label>Duration (minutes)<input type="number" min="1" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} /></label>}
            <label>Type
              <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                <option value="regular">Regular class</option><option value="makeup">Make-up class</option></select></label>
          </div>
          {warn && <div className="msg err" style={{ marginTop: 14, marginBottom: 0 }}>{warn}</div>}
        </div>

        {f.status === 'held' && cid && (
          <div className="card">
            <h2>Attendance ({roster.length} student{roster.length === 1 ? '' : 's'})</h2>
            {roster.length === 0 && <p className="muted">No active students in this class.</p>}
            {roster.map((r) => (
              <div className="attrow" key={r.student_id}>
                <span><b>{r.name}</b> <span className="muted">{r.student_id}</span></span>
                <span className="seg">
                  {['present', 'absent', 'excused'].map((s) => (
                    <button type="button" key={s} className={att[r.student_id] === s ? `on ${s}` : ''} onClick={() => setAtt({ ...att, [r.student_id]: s })}>{s}</button>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <h2>What was covered</h2>
          <div className="fields" style={{ gridTemplateColumns: '1fr' }}>
            <label>Topic covered<textarea value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></label>
            <label>Homework / next plan<textarea value={f.homework} onChange={(e) => setF({ ...f, homework: e.target.value })} /></label>
            <label>Notes (optional)<textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
          </div>
          <button style={{ marginTop: 16 }} disabled={busy || !cid || !!warn}>{busy ? 'Saving…' : 'Save session report'}</button>
        </div>
      </form>
    </>
  );
}

export default function Log() {
  return (
    <Shell title="Log a session" subtitle="Replaces the Google Form: fill it in after each lesson" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
