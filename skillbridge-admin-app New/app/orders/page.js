'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg, useAuth } from '../../components/Shell';
import { supabase, money } from '../../lib/supabase';

const ROLES = ['admin', 'accountant'];
const LABEL = { awaiting_payment: 'Waiting for payment', receipt_uploaded: 'Receipt received', confirmed: 'Confirmed', rejected: 'Rejected', cancelled: 'Cancelled' };
const METHOD = { bank_transfer: 'Bank transfer', wallet: 'E-wallet', cash: 'Pay at center' };

function Inner() {
  const me = useAuth();
  const [orders, setOrders] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState('receipt_uploaded');
  const [open, setOpen] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [pick, setPick] = useState({ cls: '', stu: '', note: '' });
  const [msg, setMsg] = useState(null);
  const isAdmin = me.role === 'admin';

  const load = useCallback(async () => {
    const [o, c, s] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(200),
      supabase.from('classes').select('id,name,status').order('id'),
      supabase.from('students').select('id,name').order('id'),
    ]);
    setOrders(o.data || []); setClasses((c.data || []).filter((x) => x.status === 'active')); setStudents(s.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const show = async (o) => {
    setOpen(o.id); setReceipt(null); setMsg(null); setPick({ cls: '', stu: '', note: '' });
    if (o.receipt_path) {
      const { data } = await supabase.storage.from('receipts').createSignedUrl(o.receipt_path, 300);
      setReceipt(data?.signedUrl ? { url: data.signedUrl, pdf: /\.pdf$/i.test(o.receipt_path) } : null);
    }
  };
  const confirmIt = async (o) => {
    setMsg(null);
    const { data, error } = await supabase.rpc('admin_confirm_order', { p_order: o.id, p_class: pick.cls || null, p_student: pick.stu || null });
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: data?.invite_code ? `Confirmed. Student ${data.student_id}, invite code ${data.invite_code}.` : 'Confirmed.' });
    load();
  };
  const reject = async (o) => {
    const { error } = await supabase.rpc('admin_reject_order', { p_order: o.id, p_note: pick.note || null });
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: 'Rejected. The customer sees your note and can upload a new receipt.' }); load();
  };

  const rows = orders.filter((o) => filter === 'all' || o.status === filter);
  const cur = orders.find((o) => o.id === open);
  const hasCourse = cur && cur.order_items.some((i) => i.item_type === 'course');
  const needsClass = cur && cur.order_items.some((i) => i.item_type === 'course' && !i.class_id);
  const pending = cur && ['awaiting_payment', 'receipt_uploaded'].includes(cur.status);
  return (
    <>
      <Msg msg={msg} />
      <div className="card">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="all">All orders</option>
          {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="card"><div className="scroll"><table>
        <thead><tr><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Pay</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.length === 0 && <tr><td colSpan="7" className="muted">No orders here.</td></tr>}
          {rows.map((o) => (
            <tr key={o.id}>
              <td>{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
              <td>{o.customer_name}<br /><small className="muted">{o.phone}</small></td>
              <td>{o.order_items.map((i) => i.title).join(', ')}</td>
              <td>{money(o.total)}</td><td>{METHOD[o.payment_method]}</td>
              <td>{LABEL[o.status]}{o.receipt_path ? ' 🧾' : ''}</td>
              <td><button className="small" onClick={() => show(o)}>Open</button></td>
            </tr>))}</tbody>
      </table></div></div>
      {cur && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{cur.customer_name} · {LABEL[cur.status]}</h3>
          <p className="muted">Phone {cur.phone}{cur.email ? ` · ${cur.email}` : ''}{cur.student_name ? ` · Student: ${cur.student_name}` : ''}{cur.city ? ` · ${cur.city}, ${cur.address}` : ''}{cur.notes ? ` · Note: ${cur.notes}` : ''}</p>
          <ul>{cur.order_items.map((i) => <li key={i.id}>{i.title} × {i.qty} · {money(i.unit_price)}{i.class_id ? ` · class ${i.class_id}` : ''}</li>)}</ul>
          <p><b>Total {money(cur.total)}</b>{Number(cur.delivery_fee) ? ` (delivery ${money(cur.delivery_fee)})` : ''}</p>
          {receipt ? (receipt.pdf ? <a href={receipt.url} target="_blank" rel="noreferrer">Open receipt (PDF)</a> : <a href={receipt.url} target="_blank" rel="noreferrer"><img src={receipt.url} alt="Receipt" style={{ maxWidth: 320, borderRadius: 8, border: '1px solid #d6dfeb' }} /></a>) : <p className="muted">No receipt uploaded.</p>}
          {cur.admin_note && <p className="muted">Note sent: {cur.admin_note}</p>}
          {isAdmin && pending && (
            <div style={{ display: 'grid', gap: 10, maxWidth: 420, marginTop: 12 }}>
              {hasCourse && <>
                {needsClass && <label>Class for the student<select value={pick.cls} onChange={(e) => setPick({ ...pick, cls: e.target.value })}><option value="">Choose later</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
                <label>Existing student (leave empty to create a new one)<select value={pick.stu} onChange={(e) => setPick({ ...pick, stu: e.target.value })}><option value="">New student</option>{students.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</select></label>
              </>}
              <button onClick={() => confirmIt(cur)}>Confirm payment</button>
              <label>Reason, shown to the customer<input value={pick.note} onChange={(e) => setPick({ ...pick, note: e.target.value })} /></label>
              <button className="danger" onClick={() => reject(cur)}>Reject</button>
            </div>)}
        </div>)}
    </>
  );
}

export default function Orders() {
  return <Shell title="Website orders" subtitle="Check receipts, confirm payments and open places" roles={ROLES}><Inner /></Shell>;
}
