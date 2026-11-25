'use client';
import { useState } from 'react';

// Inline-editable table. columns: [{key,label,type:'text'|'number'|'date'|'select',options?,readOnly?}]
export default function EditTable({ rows, columns, keyField = 'id', onSave }) {
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(null);
  const val = (r, c) => (edits[r[keyField]] && c.key in edits[r[keyField]] ? edits[r[keyField]][c.key] : r[c.key] ?? '');
  const set = (r, c, v) => setEdits((p) => ({ ...p, [r[keyField]]: { ...(p[r[keyField]] || {}), [c.key]: v } }));
  const save = async (r) => {
    const raw = edits[r[keyField]]; if (!raw) return;
    const patch = {};
    for (const c of columns) if (c.key in raw) patch[c.key] = raw[c.key] === '' ? null : c.type === 'number' ? Number(raw[c.key]) : raw[c.key];
    setBusy(r[keyField]);
    const ok = await onSave(r, patch);
    setBusy(null);
    if (ok !== false) setEdits((p) => { const n = { ...p }; delete n[r[keyField]]; return n; });
  };
  return (
    <div className="scroll"><table>
      <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r[keyField]}>
          {columns.map((c) => (
            <td key={c.key}>
              {c.readOnly ? <span>{r[c.key]}</span>
                : c.type === 'select'
                  ? <select value={val(r, c)} onChange={(e) => set(r, c, e.target.value)}>{(c.options || []).map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select>
                  : <input type={c.type || 'text'} step={c.type === 'number' ? 'any' : undefined} value={val(r, c)} placeholder={c.placeholder} onChange={(e) => set(r, c, e.target.value)} />}
            </td>
          ))}
          <td>{edits[r[keyField]] && <button className="small" disabled={busy === r[keyField]} onClick={() => save(r)}>{busy === r[keyField] ? '…' : 'Save'}</button>}</td>
        </tr>))}</tbody>
    </table></div>
  );
}
