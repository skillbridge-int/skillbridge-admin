'use client';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Friendly class names: "Adult Group English · Elementary 2".
// If two classes would read the same, the start date is added so teachers can tell them apart.
export function useClassLabels() {
  const [map, setMap] = useState({});
  useEffect(() => {
    (async () => {
      const [c, k] = await Promise.all([
        supabase.from('classes').select('id,name,course_id,start_date'),
        supabase.from('courses').select('id,level'),
      ]);
      const lvl = Object.fromEntries((k.data || []).map((x) => [x.id, x.level]));
      const base = (x) => x.name + (lvl[x.course_id] ? ' · ' + lvl[x.course_id] : '');
      const count = {};
      for (const x of c.data || []) count[base(x)] = (count[base(x)] || 0) + 1;
      const m = {};
      for (const x of c.data || []) {
        const b = base(x);
        m[x.id] = count[b] > 1 && x.start_date ? `${b} (started ${x.start_date})` : b;
      }
      setMap(m);
    })();
  }, []);
  return (id) => map[id] || id;
}
