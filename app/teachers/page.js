'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg } from '../../components/Shell';
import { supabase, money, today } from '../../lib/supabase';

const ROLES = ['admin', 'accountant'];

function Inner() {
  const [bal, setBal] = useState([]);
  const [due, setDue] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [msg, setMsg] = useState(null);
  const [f, setF] = useState({ teacher_id: '', month: today().slice(0, 7) + '-01', amount: '', paid_on: today(), notes: '' });

  const load = useCallback(async () => {
    const [b, d, p] = await Promise.all([
      supabase.from('v_teacher_balance').select('*').order('teacher_id'),
      supabase.from('v_teacher_monthly_due').select('*').order('month', { ascending: false }).order('teacher_id'),
      supabase.from('teacher_payouts').select('*').order('paid_on', { ascending: false, nullsFirst: false }),
    ]);
    setBal(b.data || []); setDue(d.data || []); setPayouts(p.data || []);
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
  const nameOf = Object.fromEntries(bal.map((t) => [t.teacher_id, t.name]));

  return (
    <>
      <Msg msg={msg} />
      <div className="two">
        <div className="card"><h2>Balances</h2>
          <div className="scroll"><table>
            <thead><tr><th>Teacher</th><th className="right">Earned</th><th className="right">Paid</th><th className="right">Balance</th></tr></thead>
            <tbody>{bal.map((t) => (
              <tr key={t.teacher_id}><td>{t.name}</td><td className="right">{money(t.total_due)}</td><td className="right">{money(t.total_paid)}</td><td className="right"><b>{money(t.balance)}</b></td></tr>))}</tbody>
          </table></div></div>
        <form className="card" onSubmit={submit}><h2>Record a payout</h2>
          <div className="fields">
            <label>Teacher
              <select required value={f.teacher_id} onChange={(e) => setF({ ...f, teacher_id: e.target.value })}>
                <option value="">—</option>{bal.map((t) => <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>)}</select></label>
            <label>For month<input type="month" value={f.month.slice(0, 7)} onChange={(e) => setF({ ...f, month: e.target.value + '-01' })} /></label>
            <label>Amount<input type="number" step="0.01" min="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
            <label>Paid on<input type="date" value={f.paid_on} onChange={(e) => setF({ ...f, paid_on: e.target.value })} /></label>
          </div>
          <button style={{ marginTop: 14 }}>Save payout</button>
        </form>
      </div>
      <div className="card" style={{ marginBottom: 16 }}><h2>Monthly earnings by class</h2>
        <p className="muted" style={{ marginTop: -6 }}>Free students add no revenue, so they are left out of both the teacher&apos;s share and SkillBridge&apos;s share.</p>
        <div className="scroll"><table>
          <thead><tr><th>Month</th><th>Teacher</th><th>Class</th><th>Sessions</th><th>Paying students</th><th className="right">Revenue</th><th>Share</th><th className="right">Teacher</th><th className="right">SkillBridge</th></tr></thead>
          <tbody>{due.map((r, i) => (
            <tr key={i}><td>{String(r.month).slice(0, 7)}</td><td>{r.teacher_name}</td><td>{r.class_id}</td><td>{r.sessions_held}</td><td>{r.students}</td>
              <td className="right">{money(r.gross)}</td><td>{r.teacher_share_pct}%</td><td className="right"><b>{money(r.teacher_due)}</b></td><td className="right">{money(r.skillbridge_share)}</td></tr>))}</tbody>
        </table></div></div>
      {payouts.length > 0 && (
        <div className="card"><h2>Payouts made</h2>
          <div className="scroll"><table>
            <thead><tr><th>Date</th><th>Teacher</th><th>For month</th><th className="right">Amount</th><th>Notes</th></tr></thead>
            <tbody>{payouts.map((p) => (<tr key={p.id}><td>{p.paid_on || '—'}</td><td>{nameOf[p.teacher_id]}</td><td>{String(p.month).slice(0, 7)}</td><td className="right">{money(p.amount)}</td><td>{p.notes}</td></tr>))}</tbody>
          </table></div></div>
      )}
    </>
  );
}

export default function Teachers() {
  return (
    <Shell title="Teacher pay" subtitle="What each teacher has earned and been paid" roles={ROLES}>
      <Inner />
    </Shell>
  );
}
