'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell, { Kpi, useAuth } from '../../components/Shell';
import { supabase, money, today } from '../../lib/supabase';
import { useClassLabels } from '../../lib/labels';

const ROLES = ['teacher'];

function Inner() {
  const { name } = useAuth();
  const L = useClassLabels();
  const [classes, setClasses] = useState([]);
  const [rosters, setRosters] = useState({});
  const [sessions, setSessions] = useState([]);
  const [earn, setEarn] = useState([]);
  const [bal, setBal] = useState(null);
  const [payouts, setPayouts] = useState([]);

  useEffect(() => {
    (async () => {
      const [c, s, e, b, p, k] = await Promise.all([
        supabase.from('classes').select('id,course_id,status,start_date').order('id'),
        supabase.from('sessions').select('class_id,session_no,session_date,status'),
        supabase.rpc('my_earnings'),
        supabase.rpc('my_balance'),
        supabase.from('teacher_payouts').select('*').order('paid_on', { ascending: false, nullsFirst: false }),
        supabase.from('courses').select('id,name,total_sessions'),
      ]);
      const courses = Object.fromEntries((k.data || []).map((x) => [x.id, x]));
      setClasses((c.data || []).map((x) => ({ ...x, course: courses[x.course_id] })));
      setSessions(s.data || []); setEarn(e.data || []); setBal((b.data || [])[0] || null); setPayouts(p.data || []);
      const r = {};
      await Promise.all((c.data || []).filter((x) => x.status === 'active').map(async (x) => { const rr = await supabase.rpc('roster_of', { cid: x.id }); r[x.id] = rr.data || []; }));
      setRosters(r);
    })();
  }, []);

  const month = today().slice(0, 7);
  const heldThisMonth = sessions.filter((s) => s.status === 'held' && String(s.session_date).startsWith(month)).length;
  const earnedThisMonth = earn.filter((x) => String(x.month).startsWith(month)).reduce((a, x) => a + Number(x.teacher_due), 0);
  const held = (id) => sessions.filter((s) => s.class_id === id && s.status === 'held').length;

  return (
    <>
      <div className="grid">
        <Kpi icon="classes" label="Active classes" value={classes.filter((c) => c.status === 'active').length} />
        <Kpi icon="sessions" label="Sessions held this month" value={heldThisMonth} />
        <Kpi icon="payments" label="Earned this month (LYD)" value={money(earnedThisMonth)} tone="ok" />
        <Kpi icon="payments" label="Balance to be paid to you (LYD)" value={money(bal?.balance || 0)} hint={bal ? `Earned ${money(bal.total_due)} · Paid ${money(bal.total_paid)}` : ''} />
      </div>
      <p><Link href="/log/"><button>+ Log a session</button></Link></p>
      <div className="two">
        {classes.map((c) => {
          const h = held(c.id), tot = c.course?.total_sessions || 12, pct = Math.round(100 * Math.min(h, tot) / tot);
          return (
            <div className="card classcard" key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><h3>{L(c.id)}</h3><span className={`pill ${c.status}`}>{c.status}</span></div>
              <div className="muted">{c.id}</div>
              <div><span className="bar" style={{ width: 180 }}><i style={{ width: `${pct}%` }} /></span> {h}/{tot} sessions · {pct}%</div>
              {c.status === 'active' && <div className="chips">{(rosters[c.id] || []).map((r) => <span key={r.student_id} className="chip">{r.name}</span>)}</div>}
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>My earnings by month</h2>
        <div className="scroll"><table>
          <thead><tr><th>Month</th><th>Class</th><th>Sessions held</th><th>Paying students</th><th className="right">My fee (LYD)</th></tr></thead>
          <tbody>{earn.length === 0 && <tr><td colSpan="5" className="muted">No earnings yet.</td></tr>}
            {earn.map((x, i) => <tr key={i}><td>{String(x.month).slice(0, 7)}</td><td>{L(x.class_id)}</td><td>{x.sessions_held}</td><td>{x.students}</td><td className="right"><b>{money(x.teacher_due)}</b></td></tr>)}</tbody>
        </table></div>
        <p className="muted" style={{ marginBottom: 0 }}>Fees are calculated from the sessions you held in your own classes.</p>
      </div>
      {payouts.length > 0 && (
        <div className="card"><h2>Payments received</h2>
          <div className="scroll"><table>
            <thead><tr><th>Date</th><th>For month</th><th className="right">Amount (LYD)</th></tr></thead>
            <tbody>{payouts.map((p) => <tr key={p.id}><td>{p.paid_on || '—'}</td><td>{String(p.month).slice(0, 7)}</td><td className="right">{money(p.amount)}</td></tr>)}</tbody>
          </table></div></div>
      )}
    </>
  );
}

export default function TeacherHome() {
  return (
    <Shell title="My overview" subtitle="Your classes, sessions and fees" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
