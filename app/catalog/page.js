'use client';
import { useEffect, useState, useCallback } from 'react';
import Shell, { Msg } from '../../components/Shell';
import { supabase, nextId } from '../../lib/supabase';

const ROLES = ['admin'];
const TABS = ['Courses', 'Teachers', 'Classes', 'Books', 'Site settings'];
const SETTING_LABELS = {
  tagline: 'Tagline', about_en: 'About (English)', about_ar: 'About (Arabic)', contact_phone: 'Phone', whatsapp: 'WhatsApp number (with country code)', contact_email: 'Email',
  address_en: 'Address (English)', address_ar: 'Address (Arabic)', bank_name: 'Bank name', bank_account_name: 'Bank account name', bank_account_number: 'Bank account / IBAN',
  wallet_name: 'E-wallet name', wallet_number: 'E-wallet number', payment_note_en: 'Payment note (English)', payment_note_ar: 'Payment note (Arabic)',
  delivery_fee: 'Delivery fee (LYD)', delivery_note_en: 'Delivery note (English)', delivery_note_ar: 'Delivery note (Arabic)',
};

async function uploadTo(bucket, folder, file, max) {
  if (file.size > max) throw new Error(`File is larger than ${Math.round(max / 1048576)} MB.`);
  const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^A-Za-z0-9._-]+/g, '_')}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw new Error(error.message);
  return path;
}

function Field({ label, value, onChange, type = 'text', area }) {
  return <label style={{ display: 'grid', gap: 4 }}>{label}{area ? <textarea rows={2} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /> : <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}</label>;
}
function Check({ label, value, onChange }) {
  return <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={!!value} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}

function Inner() {
  const [tab, setTab] = useState('Courses');
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const table = { Courses: 'courses', Teachers: 'teachers', Classes: 'classes', Books: 'books' }[tab];
  const load = useCallback(async () => {
    if (tab === 'Site settings') {
      const { data } = await supabase.from('site_settings').select('key,value'); const m = {}; (data || []).forEach((r) => { m[r.key] = r.value; }); setDraft(m); return;
    }
    const { data } = await supabase.from(table).select('*').order('id'); setRows(data || []);
  }, [tab, table]);
  useEffect(() => { setMsg(null); setDraft({}); load(); }, [load]);

  const set = (id, k, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v, _dirty: true } : r)));
  const save = async (r, cols) => {
    setBusy(true); setMsg(null);
    const patch = {}; cols.forEach((c) => { patch[c] = r[c] === '' ? null : r[c]; });
    const { error } = await supabase.from(table).update(patch).eq('id', r.id);
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: 'Saved.' }); load();
  };
  const pic = async (r, col, bucket, max, file) => {
    if (!file) return;
    try { const p = await uploadTo(bucket, table, file, max); set(r.id, col, p); } catch (e) { setMsg({ type: 'err', text: e.message }); }
  };

  const saveSettings = async () => {
    setBusy(true);
    const up = Object.keys(SETTING_LABELS).map((k) => ({ key: k, value: draft[k] ?? '' }));
    const { error } = await supabase.from('site_settings').upsert(up);
    setBusy(false); setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: 'Saved. The website shows it now.' });
  };

  const addBook = async () => {
    const id = nextId('BK', rows.map((r) => r.id));
    const { error } = await supabase.from('books').insert({ id, title_en: 'New book', has_physical: true, price_physical: 0, published: false });
    if (error) return setMsg({ type: 'err', text: error.message });
    load();
  };
  const delBook = async (r) => {
    if (!confirm(`Delete "${r.title_en}"?`)) return;
    const { error } = await supabase.from('books').delete().eq('id', r.id);
    if (error) return setMsg({ type: 'err', text: 'Cannot delete a book that has orders. Untick Show on website instead.' });
    load();
  };

  const body = () => {
    if (tab === 'Site settings') return (
      <div className="card" style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <p className="muted" style={{ margin: 0 }}>These texts appear on the public website. Bank and wallet details are shown to customers at checkout.</p>
        {Object.entries(SETTING_LABELS).map(([k, l]) => <Field key={k} label={l} value={draft[k]} onChange={(v) => setDraft({ ...draft, [k]: v })} area={/about|note/.test(k)} />)}
        <button disabled={busy} onClick={saveSettings}>Save settings</button>
      </div>);
    return rows.map((r) => (
      <div className="card" key={r.id} style={{ display: 'grid', gap: 10 }}>
        <b>{r.id} · {r.name || r.title_en}</b>
        {tab === 'Courses' && <>
          <Check label="Show on website" value={r.published} onChange={(v) => set(r.id, 'published', v)} />
          <Field label="Title (Arabic)" value={r.title_ar} onChange={(v) => set(r.id, 'title_ar', v)} />
          <Field label="Level (Arabic)" value={r.level_ar} onChange={(v) => set(r.id, 'level_ar', v)} />
          <Field label="Summary (English)" value={r.summary_en} onChange={(v) => set(r.id, 'summary_en', v)} area />
          <Field label="Summary (Arabic)" value={r.summary_ar} onChange={(v) => set(r.id, 'summary_ar', v)} area />
          <label>Picture (max 5 MB)<input type="file" accept="image/*" onChange={(e) => pic(r, 'image_path', 'site-media', 5242880, e.target.files[0])} /></label>
          <button disabled={busy} onClick={() => save(r, ['published', 'title_ar', 'level_ar', 'summary_en', 'summary_ar', 'image_path'])}>Save</button></>}
        {tab === 'Teachers' && <>
          <Check label="Show on website" value={r.published} onChange={(v) => set(r.id, 'published', v)} />
          <Field label="Name (Arabic)" value={r.name_ar} onChange={(v) => set(r.id, 'name_ar', v)} />
          <Field label="Specialty (Arabic)" value={r.specialty_ar} onChange={(v) => set(r.id, 'specialty_ar', v)} />
          <Field label="Short bio (English)" value={r.bio_en} onChange={(v) => set(r.id, 'bio_en', v)} area />
          <Field label="Short bio (Arabic)" value={r.bio_ar} onChange={(v) => set(r.id, 'bio_ar', v)} area />
          <label>Photo (max 5 MB)<input type="file" accept="image/*" onChange={(e) => pic(r, 'photo_path', 'site-media', 5242880, e.target.files[0])} /></label>
          <button disabled={busy} onClick={() => save(r, ['published', 'name_ar', 'specialty_ar', 'bio_en', 'bio_ar', 'photo_path'])}>Save</button></>}
        {tab === 'Classes' && <>
          <Check label="Open for enrollment on website" value={r.open_for_enrollment} onChange={(v) => set(r.id, 'open_for_enrollment', v)} />
          <Field label="Seats (empty = unlimited)" type="number" value={r.capacity} onChange={(v) => set(r.id, 'capacity', v === '' ? '' : Number(v))} />
          <button disabled={busy} onClick={() => save(r, ['open_for_enrollment', 'capacity'])}>Save</button></>}
        {tab === 'Books' && <>
          <Check label="Show on website" value={r.published} onChange={(v) => set(r.id, 'published', v)} />
          <Field label="Title (English)" value={r.title_en} onChange={(v) => set(r.id, 'title_en', v)} />
          <Field label="Title (Arabic)" value={r.title_ar} onChange={(v) => set(r.id, 'title_ar', v)} />
          <Field label="Author" value={r.author} onChange={(v) => set(r.id, 'author', v)} />
          <Field label="Description (English)" value={r.description_en} onChange={(v) => set(r.id, 'description_en', v)} area />
          <Field label="Description (Arabic)" value={r.description_ar} onChange={(v) => set(r.id, 'description_ar', v)} area />
          <Check label="Sold as PDF" value={r.has_digital} onChange={(v) => set(r.id, 'has_digital', v)} />
          {r.has_digital && <><Field label="PDF price" type="number" value={r.price_digital} onChange={(v) => set(r.id, 'price_digital', v === '' ? '' : Number(v))} />
            <label>PDF file (max 50 MB){r.file_path ? ' · uploaded' : ''}<input type="file" accept="application/pdf" onChange={(e) => pic(r, 'file_path', 'book-files', 52428800, e.target.files[0])} /></label></>}
          <Check label="Sold as printed copy" value={r.has_physical} onChange={(v) => set(r.id, 'has_physical', v)} />
          {r.has_physical && <><Field label="Printed price" type="number" value={r.price_physical} onChange={(v) => set(r.id, 'price_physical', v === '' ? '' : Number(v))} />
            <Field label="Copies in stock (empty = not tracked)" type="number" value={r.stock} onChange={(v) => set(r.id, 'stock', v === '' ? '' : Number(v))} /></>}
          <label>Cover (max 5 MB)<input type="file" accept="image/*" onChange={(e) => pic(r, 'cover_path', 'site-media', 5242880, e.target.files[0])} /></label>
          <div style={{ display: 'flex', gap: 8 }}><button disabled={busy} onClick={() => save(r, ['published', 'title_en', 'title_ar', 'author', 'description_en', 'description_ar', 'has_digital', 'has_physical', 'price_digital', 'price_physical', 'stock', 'file_path', 'cover_path'])}>Save</button><button className="danger" onClick={() => delBook(r)}>Delete</button></div></>}
      </div>));
  };
  return (
    <>
      <Msg msg={msg} />
      <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{TABS.map((t) => <button key={t} className={t === tab ? '' : 'ghost'} onClick={() => setTab(t)}>{t}</button>)}{tab === 'Books' && <button className="small" onClick={addBook}>+ Add book</button>}</div>
      {body()}
    </>
  );
}

export default function Catalog() {
  return <Shell title="Website catalog" subtitle="Choose what the public website shows" roles={ROLES}><Inner /></Shell>;
}
