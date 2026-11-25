'use client';
import { supabase } from './supabase';

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const isOverdue = (due) => due && String(due) < new Date().toISOString().slice(0, 10);

export async function openFile(path) {
  const { data, error } = await supabase.storage.from('task-files').createSignedUrl(path, 3600);
  if (error) return alert('Could not open the file: ' + error.message);
  window.open(data.signedUrl, '_blank', 'noopener');
}

export async function uploadTaskFile(classId, file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('The file is larger than 10 MB. Share a link instead.');
  const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, '_');
  const path = `${classId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from('task-files').upload(path, file);
  if (error) throw new Error(error.message);
  return { file_path: path, file_name: file.name };
}
