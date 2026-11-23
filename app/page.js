'use client';
import { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { supabase, money } from '../lib/supabase';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [classes, setClasses] = useState([]);
  const [owing, setOwing] = useState([]);
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    (async () => {
      const [a, b, c, s, e] = await Promise.all([
        supabase.from('v_dashboard').select('*').single(),
        supabase.from('v_class_progress').select('*').order('class_id'),
        supabase.from('v_enrollment_finance').select('*').gt('balance', 0).order('balance', { ascending: false }),
        supabase.from('students').select('id,name'),
        supabase.from('v_session_issues').select('*'),
      ]);
      setD(a.data); setClasses(b.data || []); setIssues(e.data || []);
      const names = Object.fromEntries((s.data || []).map((x) => [x.id, x.name]));
      setOwing((c.data || []).map((r) => ({ ...r, name: names[r.student_id] })));
    })();
  }, []);

  const k = (label, value, cls = '') => (
    <div className={`card kpi ${cls}`}><small>{label}</small><b>{value}</b></div>
  );

  return (
    <Shell title="Dashboard">
      {d && (
        <div className="grid">
          {k('Active students', d.active_students)}
          {k('Active classes', d.active_classes)}
          {k('Expected revenue (LYD)', money(d.expected_revenue))}
          {k('Collected (LYD)', money(d.collected), 'ok')}
          {k('Outstanding (LYD)', money(d.outstanding), 'bad')}
          {k('Sessions this month', d.sessions_this_month)}
          {k('Owed to teachers (LYD)', money(d.teachers_balance))}
          {k('Overdue follow-ups', d.overdue_followups)}
        </div>
      )}
      <div className="two">
        <div className="card">
          <h2>Class progress</h2>
          <div className="scroll"><table>
            <thead><tr><th>Class</th><th>Status</th><th>Held</th><th>Students</th><th>Progress</th></tr></thead>
            <tbody>{classes.map((c) => (
              <tr key={c.class_id}>
                <td>{c.class_id}</td><td><span className={`pill ${c.status}`}>{c.status}</span></td>
                <td>{c.held}/{c.total}</td><td>{c.enrolled}</td>
                <td><div className="bar"><i style={{ width: `${c.progress_pct}%` }} /></div></td>
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
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Session log issues ({issues.length})</h2>
          <div className="scroll"><table>
            <thead><tr><th>Class</th><th>No.</th><th>Date</th><th>Issue</th></tr></thead>
            <tbody>{issues.map((i, n) => (
              <tr key={n}><td>{i.class_id}</td><td>{i.session_no}</td><td>{i.session_date}</td><td>{i.issue}</td></tr>))}</tbody>
          </table></div>
        </div>
      )}
    </Shell>
  );
}
