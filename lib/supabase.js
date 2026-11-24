import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qschghbpkirimscnxyuv.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzY2hnaGJwa2lyaW1zY254eXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MjQyOTAsImV4cCI6MjExMTAwMDI5MH0.Jjo_xZRatijw1yRklIpnNfqUWVzcejrnsSKXtoWuLns'
);

export const BASE = process.env.NEXT_PUBLIC_BASE || '';

export const money = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n || 0));

// next free business id such as S-015 / T-005 / CRS-006
export function nextId(prefix, ids) {
  const max = ids.reduce((m, id) => Math.max(m, parseInt(String(id).replace(/\D/g, ''), 10) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const monthLabel = (d) => String(d).slice(0, 7);

export const ROLE_LABEL = {
  admin: 'Admin', accountant: 'Accountant', coordinator: 'Coordinator', teacher: 'Teacher', parent: 'Parent',
};
