'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Shell, { Msg, Kpi } from '../../components/Shell';
import { supabase } from '../../lib/supabase';
import { fmtDate, fmtTime, isOverdue, openFile } from '../../lib/posts';

const ROLES = ['parent'];

function Thread({ task, child, comments, onSent }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = comments.filter((c) => c.task_id === task.id && c.student_id === child.student_id);
  const send = async (e) => {
    e.preventDefault(); if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('task_comments').insert({ task_id: task.id, student_id: child.student_id, body: text.trim() });
    setBusy(false);
    if (error) return alert(error.message);
    setText(''); onSent();
  };
  return (
    <div className="thread">
      {mine.map((c) => <div key={c.id} className="cmt"><b>{c.author_name}</b> <small className="muted">{fmtTime(c.created_at)}</small><div>{c.body}</div></div>)}
      <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask the teacher a question…" maxLength={2000} />
        <button disabled={busy || !text.trim()}>Send</button>
      </form>
    </div>
  );
}

function Inner() {
  const [tab, setTab] = useState('classes');
  const [rows, setRows] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [news, setNews] = useState([]);
  const [done, setDone] = useState([]);
  const [comments, setComments] = useState([]);
  const [who, setWho] = useState('');     // student id filter
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [o, t, a, d, c] = await Promise.all([
      supabase.rpc('family_overview'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('task_done').select('*'),
      supabase.from('task_comments').select('*').order('created_at'),
    ]);
    setRows(o.data || []); setTasks(t.data || []); setNews(a.data || []); setDone(d.data || []); setComments(c.data || []);
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const kids = useMemo(() => { const m = new Map(); rows.forEach((r) => m.set(r.student_id, r.student_name)); return [...m].map(([id, name]) => ({ id, name })); }, [rows]);
  const classLabel = (r) => r.class_name + (r.level ? ' · ' + r.level : '');
  const shownRows = rows.filter((r) => !who || r.student_id === who);
  const myClassIds = new Set(shownRows.map((r) => r.class_id));
  const labelOf = Object.fromEntries(rows.map((r) => [r.class_id, classLabel(r)]));
  const shownTasks = tasks.filter((t) => myClassIds.has(t.class_id));
  const shownNews = news.filter((n) => !n.class_id || myClassIds.has(n.class_id));
  const isDone = (tid, sid) => done.some((d) => d.task_id === tid && d.student_id === sid);
  const toggle = async (tid, sid) => {
    if (isDone(tid, sid)) await supabase.from('task_done').delete().eq('task_id', tid).eq('student_id', sid);
    else await supabase.from('task_done').insert({ task_id: tid, student_id: sid });
    load();
  };
  const open = shownTasks.filter((t) => shownRows.filter((r) => r.class_id === t.class_id).some((r) => !isDone(t.id, r.student_id))).length;

  if (loaded && rows.length === 0) return <div className="card"><h2>Nothing here yet</h2><p className="muted">No classes are linked to this login. Ask the center to check your invite code.</p></div>;

  return (
    <>
      <div className="grid">
        <Kpi icon="classes" label="Classes" value={new Set(shownRows.map((r) => r.class_id)).size} />
        <Kpi icon="posts" label="Tasks to do" value={open} tone={open ? 'warn' : ''} />
        <Kpi icon="sessions" label="Announcements" value={shownNews.length} />
      </div>
      {kids.length > 1 && (
        <div className="tabs"><button className={!who ? 'on' : ''} onClick={() => setWho('')}>All children</button>
          {kids.map((k) => <button key={k.id} className={who === k.id ? 'on' : ''} onClick={() => setWho(k.id)}>{k.name}</button>)}</div>
      )}
      <div className="tabs">{[['classes', 'My classes'], ['tasks', `Tasks (${shownTasks.length})`], ['news', `Announcements (${shownNews.length})`]].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'classes' && (
        <div className="two">{shownRows.map((r) => {
          const pct = r.total ? Math.round(100 * Math.min(r.held, r.total) / r.total) : 0;
          const st = r.enrollment_status === 'completed' || r.class_status === 'completed' ? 'completed' : 'active';
          return (
            <div className="card classcard" key={r.student_id + r.class_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><h3>{classLabel(r)}</h3><span className={`pill ${st}`}>{st}</span></div>
              {kids.length > 1 && <div className="muted">Student: <b>{r.student_name}</b></div>}
              <div className="muted">Teacher: {r.teacher_name}{r.schedule_note ? ` · ${r.schedule_note}` : ''}</div>
              <div><span className="bar" style={{ width: 180 }}><i style={{ width: `${pct}%` }} /></span> {r.held}/{r.total} sessions · {pct}%</div>
              <div className="chips"><span className="chip">Attended {r.attended}</span><span className="chip">Absent {r.absences}</span></div>
            </div>
          );
        })}</div>
      )}

      {tab === 'tasks' && (
        <div className="stack">
          {shownTasks.length === 0 && <div className="card muted">No tasks yet.</div>}
          {shownTasks.map((t) => {
            const mine = shownRows.filter((r) => r.class_id === t.class_id);
            return (
              <div className="card" key={t.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>{t.title}</h3>
                  {t.due_date && <span className={`pill ${isOverdue(t.due_date) && !mine.every((r) => isDone(t.id, r.student_id)) ? 'unpaid' : 'active'}`}>Due {fmtDate(t.due_date)}</span>}
                </div>
                <div className="muted">{labelOf[t.class_id]} · posted by {t.author_name} · {fmtDate(t.created_at)}</div>
                {t.instructions && <p style={{ whiteSpace: 'pre-wrap' }}>{t.instructions}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {t.link_url && <a href={t.link_url} target="_blank" rel="noopener noreferrer"><button type="button" className="ghost small">Open link</button></a>}
                  {t.file_path && <button type="button" className="ghost small" onClick={() => openFile(t.file_path)}>Download {t.file_name || 'file'}</button>}
                </div>
                {mine.map((r) => (
                  <div key={r.student_id} style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: 'row' }}>
                      <input type="checkbox" style={{ width: 'auto' }} checked={isDone(t.id, r.student_id)} onChange={() => toggle(t.id, r.student_id)} />
                      <span>{kids.length > 1 ? `${r.student_name}: ` : ''}Mark as done</span>
                    </label>
                    <Thread task={t} child={r} comments={comments} onSent={load} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'news' && (
        <div className="stack">
          {shownNews.length === 0 && <div className="card muted">No announcements yet.</div>}
          {shownNews.map((n) => (
            <div className="card" key={n.id}>
              <h3 style={{ margin: 0 }}>{n.title}</h3>
              <div className="muted">{n.class_id ? labelOf[n.class_id] : 'SkillBridge'} · {n.author_name} · {fmtTime(n.created_at)}</div>
              {n.body && <p style={{ whiteSpace: 'pre-wrap' }}>{n.body}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Parent() {
  return (
    <Shell title="My learning" subtitle="Classes, tasks and announcements" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
