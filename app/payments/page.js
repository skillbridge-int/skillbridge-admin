'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg } from '../../components/Shell';
import { supabase, money } from '../../lib/supabase';

export default function Payments() {
  const [pays, setPays] = useState([]);
  const [fin, setFin] = useState([]);
  const [names, setNames] = useState({});
  const [msg, setMsg] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ key: '', amount: '', paid_on: today, method: 'cash', receipt_no: '', notes: '' });

  const load = useCallback(async () => {
    const [p, v, s] = await Promise.all([
      supabase.from('payments').select('*').order('paid_on', { ascending: false, nullsFirst: false }).order('id', { ascending: false }),
      supabase.from('v_enrollment_finance').select('*').order('student_id'),
      supabase.from('students').select('id,name'),
    ]);
    setPays(p.data || []); setFin(v.data || []);
    setNames(Object.fromEntries((s.data || []).map((x) => [x.id, x.name])));
  }, []);
  useEffect(() => { load(); }, [load]);

  const sel = fin.find((x) => x.student_id + '|' + x.class_id === f.key);

  const submit = async (e) => {
    e.preventDefault(); setMsg(null);
    const [student_id, class_id] = f.key.split('|');
    const { error } = await supabase.from('payments').insert({
      student_id, class_id, amount: Number(f.amount), paid_on: f.paid_on || null, method: f.method,
      receipt_no: f.receipt_no || null, notes: f.notes || null,
    });
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: 'Payment recorded.' });
    setF({ ...f, amount: '', receipt_no: '', notes: '' });
    load();
  };

  return (
    <Shell title="Payments">
      <Msg msg={msg} />
      <form className="card" onSubmit={submit} style={{ marginBottom: 16 }}>
        <h2>Record a payment</h2>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          <label>Student · class
            <select required value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })}>
              <option value="">—</option>
              {fin.map((x) => <option key={x.student_id + x.class_id} value={x.student_id + '|' + x.class_id}>{x.student_id} {names[x.student_id]} · {x.class_id}</option>)}
            </select></label>
          <label>Amount (LYD)<input type="number" step="0.01" min="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
          <label>Date<input type="date" value={f.paid_on} onChange={(e) => setF({ ...f, paid_on: e.target.value })} /></label>
          <label>Method
            <select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
              {['cash', 'bank_transfer', 'card', 'other'].map((m) => <option key={m}>{m}</option>)}</select></label>
          <label>Receipt no.<input value={f.receipt_no} onChange={(e) => setF({ ...f, receipt_no: e.target.value })} /></label>
          <label>Notes<input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
        </div>
        {sel && <p className="muted">Net fee {money(sel.net_fee)} · paid {money(sel.paid)} · balance <b>{money(sel.balance)}</b></p>}
        <button style={{ marginTop: 8 }}>Save payment</button>
      </form>
      <div className="card"><h2>History ({pays.length})</h2>
        <div className="scroll"><table>
          <thead><tr><th>Date</th><th>Student</th><th>Class</th><th className="right">Amount</th><th>Method</th><th>Receipt</th><th>Notes</th></tr></thead>
          <tbody>{pays.map((p) => (
            <tr key={p.id}><td>{p.paid_on || '—'}</td><td>{names[p.student_id]}</td><td>{p.class_id}</td>
              <td className="right">{money(p.amount)}</td><td>{p.method}</td><td>{p.receipt_no}</td><td>{p.notes}</td></tr>))}</tbody>
        </table></div></div>
    </Shell>
  );
}
