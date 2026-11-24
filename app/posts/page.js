'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg, useAuth } from '../../components/Shell';
import { supabase } from '../../lib/supabase';
import { useClassLabels } from '../../lib/labels';
import { fmtDate, fmtTime, isOverdue, openFile, uploadTaskFile } from '../../lib/posts';

const ROLES = ['admin', 'coordinator', 'teacher'];

function StudentThread({ task, student, comments, isDone, onChange }) {
  const [text, setText] = useState('');
  const mine = comments.filter((c) => c.task_id === task.id && c.student_id === student.student_id);
  const send = async (e) => {
    e.preventDefault(); if (!text.trim()) return;
    const { error } = await supabase.from('task_comments').insert({ task_id: task.id, student_id: student.student_id, body: text.trim() });
    if (error) return alert(error.message);
    setText(''); onChange();
  };
  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <b>{student.name}</b><span className={`pill ${isDone ? 'paid' : 'unpaid'}`}>{isDone ? 'done' : 'not done'}</span>
      </div>
      <div className="thread">
        {mine.map((c) => <div key={c.id} className="cmt"><b>{c.author_name}</b> <small className="muted">{fmtTime(c.created_at)}</small><div>{c.body}</div></div>)}
        <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${student.name}'s family…`} maxLength={2000} />
          <button className="small" disabled={!text.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}

function Inner() {
  const me = useAuth();
  const L = useClassLabels();
  const [tab, setTab] = useState('tasks');
  const [classes, setClasses] = useState([]);
  const [cid, setCid] = useState('');
  const [tasks, setTasks] = useState([]);
  const [news, setNews] = useState([]);
  const [done, setDone] = useState([]);
  const [comments, setComments] = useState([]);
  const [rosters, setRosters] = useState({});
  const [openT, setOpenT] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [t, setT] = useState({ title: '', instructions: '', due_date: '', link_url: '', file: null });
  const [a, setA] = useState({ audience: '', title: '', body: '' });
  const err = (e) => setMsg({ type: 'err', text: e.message || String(e) });

  const load = useCallback(async () => {
    const [c, tk, an, dn, cm] = await Promise.all([
      supabase.from('classes').select('id,status').eq('status', 'active').order('id'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('task_done').select('*'),
      supabase.from('task_comments').select('*').order('created_at'),
    ]);
    const cl = c.data || [];
    setClasses(cl); setTasks(tk.data || []); setNews(an.data || []); setDone(dn.data || []); setComments(cm.data || []);
    const r = {};
    await Promise.all(cl.map(async (x) => { const { data } = await supabase.rpc('roster_of', { cid: x.id }); r[x.id] = data || []; }));
    setRosters(r);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (classes.length === 1) setCid(classes[0].id); }, [classes]);

  const addTask = async (e) => {
    e.preventDefault(); setMsg(null);
    if (!cid) return err({ message: 'Choose a class first.' });
    setBusy(true);
    try {
      const up = t.file ? await uploadTaskFile(cid, t.file) : {};
      const { error } = await supabase.from('tasks').insert({ class_id: cid, title: t.title.trim(), instructions: t.instructions || null, due_date: t.due_date || null, link_url: t.link_url || null, ...up });
      if (error) throw error;
      setT({ title: '', instructions: '', due_date: '', link_url: '', file: null }); e.target.reset();
      setMsg({ type: 'ok', text: 'Task posted. Students and parents can see it now.' }); load();
    } catch (x) { err(x); }
    setBusy(false);
  };
  const addNews = async (e) => {
    e.preventDefault(); setMsg(null);
    const class_id = a.audience || cid || null;
    if (!class_id && me.role !== 'admin') return err({ message: 'Choose a class first.' });
    setBusy(true);
    const { error } = await supabase.from('announcements').insert({ class_id, title: a.title.trim(), body: a.body || null });
    setBusy(false);
    if (error) return err(error);
    setA({ audience: '', title: '', body: '' }); setMsg({ type: 'ok', text: 'Announcement posted.' }); load();
  };
  const delTask = async (x) => { if (!confirm(`Delete the task "${x.title}" and its replies?`)) return; if (x.file_path) await supabase.storage.from('task-files').remove([x.file_path]); const { error } = await supabase.from('tasks').delete().eq('id', x.id); if (error) return err(error); load(); };
  const delNews = async (x) => { if (!confirm(`Delete "${x.title}"?`)) return; const { error } = await supabase.from('announcements').delete().eq('id', x.id); if (error) return err(error); load(); };

  const shownTasks = tasks.filter((x) => !cid || x.class_id === cid);
  const shownNews = news.filter((x) => !cid || x.class_id === cid || !x.class_id);
  const classPicker = (
    <label>Class<select value={cid} onChange={(e) => setCid(e.target.value)}>
      <option value="">{classes.length > 1 ? 'All my classes' : '—'}</option>
      {classes.map((c) => <option key={c.id} value={c.id}>{L(c.id)}</option>)}</select></label>
  );

  return (
    <>
      <Msg msg={msg} />
      <div className="tabs">{[['tasks', 'Tasks'], ['news', 'Announcements']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'tasks' && (
        <div className="stack">
          <form className="card" onSubmit={addTask}>
            <h2>New task</h2>
            <div className="fields">
              {classPicker}
              <label>Title<input required value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} /></label>
              <label>Due date<input type="date" value={t.due_date} onChange={(e) => setT({ ...t, due_date: e.target.value })} /></label>
              <label>Link (optional)<input type="url" placeholder="https://…" value={t.link_url} onChange={(e) => setT({ ...t, link_url: e.target.value })} /></label>
              <label>File (optional, up to 10 MB)<input type="file" onChange={(e) => setT({ ...t, file: e.target.files[0] || null })} /></label>
            </div>
            <label style={{ marginTop: 10 }}>Instructions<textarea rows={3} value={t.instructions} onChange={(e) => setT({ ...t, instructions: e.target.value })} /></label>
            <p><button disabled={busy}>{busy ? 'Posting…' : 'Post task'}</button></p>
          </form>

          {shownTasks.length === 0 && <div className="card muted">No tasks yet{cid ? ' for this class' : ''}.</div>}
          {shownTasks.map((x) => {
            const ros = rosters[x.class_id] || [];
            const nDone = ros.filter((r) => done.some((d) => d.task_id === x.id && d.student_id === r.student_id)).length;
            const nMsg = comments.filter((c) => c.task_id === x.id).length;
            return (
              <div className="card" key={x.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>{x.title}</h3>
                  {x.due_date && <span className={`pill ${isOverdue(x.due_date) ? 'unpaid' : 'active'}`}>Due {fmtDate(x.due_date)}</span>}
                </div>
                <div className="muted">{L(x.class_id)} · {x.author_name} · {fmtDate(x.created_at)}</div>
                {x.instructions && <p style={{ whiteSpace: 'pre-wrap' }}>{x.instructions}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {x.link_url && <a href={x.link_url} target="_blank" rel="noopener noreferrer"><button type="button" className="ghost small">Open link</button></a>}
                  {x.file_path && <button type="button" className="ghost small" onClick={() => openFile(x.file_path)}>{x.file_name || 'File'}</button>}
                  <span className="chip">{nDone}/{ros.length} done</span>
                  <button type="button" className="ghost small" onClick={() => setOpenT(openT === x.id ? null : x.id)}>{openT === x.id ? 'Hide' : 'Students & replies'}{nMsg ? ` (${nMsg})` : ''}</button>
                  <button type="button" className="small danger" onClick={() => delTask(x)}>Delete</button>
                </div>
                {openT === x.id && ros.map((r) => <StudentThread key={r.student_id} task={x} student={r} comments={comments} isDone={done.some((d) => d.task_id === x.id && d.student_id === r.student_id)} onChange={load} />)}
                {openT === x.id && ros.length === 0 && <p className="muted">No active students in this class.</p>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'news' && (
        <div className="stack">
          <form className="card" onSubmit={addNews}>
            <h2>New announcement</h2>
            <div className="fields">
              {me.role === 'admin'
                ? <label>Send to<select value={a.audience} onChange={(e) => setA({ ...a, audience: e.target.value })}><option value="">{cid ? 'The class chosen above' : 'Everyone'}</option>{classes.map((c) => <option key={c.id} value={c.id}>{L(c.id)}</option>)}</select></label>
                : classPicker}
              <label>Title<input required value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} /></label>
            </div>
            <label style={{ marginTop: 10 }}>Message<textarea rows={3} value={a.body} onChange={(e) => setA({ ...a, body: e.target.value })} /></label>
            <p><button disabled={busy}>Post announcement</button></p>
          </form>
          {shownNews.length === 0 && <div className="card muted">No announcements yet.</div>}
          {shownNews.map((x) => (
            <div className="card" key={x.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><h3 style={{ margin: 0 }}>{x.title}</h3>{(x.author_id === me.id || me.role === 'admin') && <button className="small danger" onClick={() => delNews(x)}>Delete</button>}</div>
              <div className="muted">{x.class_id ? L(x.class_id) : 'Everyone'} · {x.author_name} · {fmtTime(x.created_at)}</div>
              {x.body && <p style={{ whiteSpace: 'pre-wrap' }}>{x.body}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Posts() {
  return (
    <Shell title="Tasks & announcements" subtitle="Post homework and news for your classes, and answer questions from students and parents" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
