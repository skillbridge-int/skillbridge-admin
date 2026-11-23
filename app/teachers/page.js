'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg } from '../../components/Shell';
import { supabase, money } from '../../lib/supabase';

export default function Teachers() {
  const [bal, setBal] = useState([]);
  const [due, setDue] = useState([]);
  const [msg, setMsg] = useState(null);
  const month = new Date().toISOString().slice(0, 7) + '-01';
  const [f, setF] = useState({ teacher_id: '', month, amount: '', paid_on: new Date().toISOString().slice(0, 10), notes: '' });

  const load = useCallback(async () => {
    const [b, d] = await Promise.all([
      supabase.from('v_teacher_balance').select('*').order('teacher_id'),
      supabase.from('v_teacher_monthly_due').select('*').order('month', { ascending: false }).order('teacher_id'),
    ]);
    setBal(b.data || []); setDue(d.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault(); setMsg(null);
    const { error } = await supabase.from('teacher_payouts').insert({
      teacher_id: f.teacher_id, month: f.month, amount: Number(f.amount), paid_on: f.paid_on || null, notes: f.notes || null,
    });
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: 'Payout recorded.' });
    setF({ ...f, amount: '', notes: '' });
    load();
  };

  return (
    <Shell title="Teachers">
      <Msg msg={msg} />
      <div className="two" style={{ marginBottom: 16 }}>
        <div className="card"><h2>Balances</h2>
          <div className="scroll"><table>
            <thead><tr><th>Teacher</th><th className="right">Due</th><th className="right">Paid</th><th className="right">Balance</th></tr></thead>
            <tbody>{bal.map((t) => (
              <tr key={t.teacher_id}><td>{t.name}</td><td className="right">{money(t.total_due)}</td><td className="right">{money(t.total_paid)}</td><td className="right"><b>{money(t.balance)}</b></td></tr>))}</tbody>
          </table></div></div>
        <form className="card" onSubmit={submit}><h2>Record a payout</h2>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
            <label>Teacher
              <select required value={f.teacher_id} onChange={(e) => setF({ ...f, teacher_id: e.target.value })}>
                <option value="">—</option>{bal.map((t) => <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>)}</select></label>
            <label>For month<input type="month" value={f.month.slice(0, 7)} onChange={(e) => setF({ ...f, month: e.target.value + '-01' })} /></label>
            <label>Amount<input type="number" step="0.01" min="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
            <label>Paid on<input type="date" value={f.paid_on} onChange={(e) => setF({ ...f, paid_on: e.target.value })} /></label>
          </div>
          <button style={{ marginTop: 12 }}>Save payout</button>
        </form>
      </div>
      <div className="card"><h2>Monthly dues by class</h2>
        <div className="scroll"><table>
          <thead><tr><th>Month</th><th>Teacher</th><th>Class</th><th>Sessions</th><th>Students</th><th className="right">Gross</th><th>Share</th><th className="right">Teacher due</th><th className="right">SkillBridge</th></tr></thead>
          <tbody>{due.map((r, i) => (
            <tr key={i}><td>{String(r.month).slice(0, 7)}</td><td>{r.teacher_name}</td><td>{r.class_id}</td><td>{r.sessions_held}</td><td>{r.students}</td>
              <td className="right">{money(r.gross)}</td><td>{r.teacher_share_pct}%</td><td className="right"><b>{money(r.teacher_due)}</b></td><td className="right">{money(r.skillbridge_share)}</td></tr>))}</tbody>
        </table></div></div>
    </Shell>
  );
}
