'use client';
import { useEffect, useState } from 'react';
import Shell, { Kpi, useAuth } from '../components/Shell';
import { BarChart, Donut } from '../components/Charts';
import { supabase, money } from '../lib/supabase';

const ROLES = ['admin', 'accountant'];

function Inner() {
  const [d, setD] = useState(null);
  const [classes, setClasses] = useState([]);
  const [owing, setOwing] = useState([]);
  const [issues, setIssues] = useState([]);
  const [byClass, setByClass] = useState([]);
  const [byMonth, setByMonth] = useState([]);

  useEffect(() => {
    (async () => {
      const [a, b, c, s, e, f, ss] = await Promise.all([
        supabase.from('v_dashboard').select('*').single(),
        supabase.from('v_class_progress').select('*').order('class_id'),
        supabase.from('v_enrollment_finance').select('*'),
        supabase.from('students').select('id,name'),
        supabase.from('v_session_issues').select('*'),
        supabase.from('v_teacher_monthly_due').select('month,gross,teacher_due,skillbridge_share'),
        supabase.from('sessions').select('session_date,status'),
      ]);
      setD(a.data); setClasses(b.data || []); setIssues(e.data || []);
      const names = Object.fromEntries((s.data || []).map((x) => [x.id, x.name]));
      const fin = c.data || [];
      setOwing(fin.filter((r) => Number(r.balance) > 0).sort((x, y) => y.balance - x.balance).map((r) => ({ ...r, name: names[r.student_id] })));
      const g = {};
      for (const r of fin) { const k = r.class_id; g[k] = g[k] || { label: k.replace('SBI-', '').replace('SBK-', ''), expected: 0, collected: 0 }; g[k].expected += Number(r.net_fee); g[k].collected += Math.min(Number(r.paid), Number(r.net_fee)); }
      setByClass(Object.values(g));
      const m = {};
      for (const r of f.data || []) { const k = String(r.month).slice(0, 7); m[k] = m[k] || { label: k, teachers: 0, center: 0 }; m[k].teachers += Number(r.teacher_due); m[k].center += Number(r.skillbridge_share); }
      setByMonth(Object.values(m).sort((x, y) => x.label.localeCompare(y.label)));
    })();
  }, []);

  const pct = d && Number(d.expected_revenue) ? Number(d.collected) / Number(d.expected_revenue) : 0;

  return (
    <>
      {d && (
        <div className="grid">
          <Kpi icon="students" label="Active students" value={d.active_students} />
          <Kpi icon="classes" label="Active classes" value={d.active_classes} />
          <Kpi icon="payments" label="Expected revenue (LYD)" value={money(d.expected_revenue)} />
          <Kpi icon="payments" tone="ok" label="Collected (LYD)" value={money(d.collected)} />
          <Kpi icon="payments" tone="bad" label="Outstanding (LYD)" value={money(d.outstanding)} />
          <Kpi icon="sessions" label="Sessions this month" value={d.sessions_this_month} />
          <Kpi icon="teachers" label="Owed to teachers (LYD)" value={money(d.teachers_balance)} />
          <Kpi icon="home" label="Overdue follow-ups" value={d.overdue_followups} />
        </div>
      )}
      <div className="two">
        <div className="card">
          <h2>Expected vs collected, by class (LYD)</h2>
          <BarChart data={byClass} series={[{ key: 'expected', label: 'Expected', color: '#9ec9f2' }, { key: 'collected', label: 'Collected', color: '#0b3367' }]} />
        </div>
        <div className="card">
          <h2>Revenue split by month (LYD)</h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}><Donut value={Number(d?.collected || 0)} total={Number(d?.expected_revenue || 0)} label="collected share" /><div className="muted" style={{ fontSize: 12 }}>collected</div></div>
            <div style={{ flex: 1 }}>
              <BarChart height={190} data={byMonth} series={[{ key: 'teachers', label: 'Teachers', color: '#1e95e9' }, { key: 'center', label: 'SkillBridge', color: '#0b3367' }]} />
            </div>
          </div>
        </div>
      </div>
      <div className="two">
        <div className="card">
          <h2>Class progress</h2>
          <div className="scroll"><table>
            <thead><tr><th>Class</th><th>Status</th><th>Held</th><th>Students</th><th>Progress</th></tr></thead>
            <tbody>{classes.map((c) => (
              <tr key={c.class_id}>
                <td>{c.class_id}</td><td><span className={`pill ${c.status}`}>{c.status}</span></td>
                <td>{c.held}/{c.total}</td><td>{c.enrolled}</td>
                <td><span className="bar"><i style={{ width: `${c.progress_pct}%` }} /></span> {c.progress_pct}%</td>
              </tr>))}</tbody>
          </table></div>
        </div>
        <div className="card">
          <h2>Unpaid balances</h2>
          <div className="scroll"><table>
            <thead><tr><th>Student</th><th>Class</th><th className="right">Balance</th></tr></thead>
            <tbody>{owing.length === 0 && <tr><td colSpan="3" className="muted">Nothing outstanding.</td></tr>}
              {owing.map((r) => (
                <tr key={r.student_id + r.class_id}><td>{r.name}</td><td>{r.class_id}</td><td className="right">{money(r.balance)}</td></tr>))}</tbody>
          </table></div>
        </div>
      </div>
      {issues.length > 0 && (
        <div className="card">
          <h2>Session log issues ({issues.length})</h2>
          <div className="scroll"><table>
            <thead><tr><th>Class</th><th>No.</th><th>Date</th><th>Issue</th></tr></thead>
            <tbody>{issues.map((i, n) => (
              <tr key={n}><td>{i.class_id}</td><td>{i.session_no}</td><td>{i.session_date}</td><td>{i.issue}</td></tr>))}</tbody>
          </table></div>
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  return (
    <Shell title="Dashboard" subtitle="Where the center stands today" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
