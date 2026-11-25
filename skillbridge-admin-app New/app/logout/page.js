'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Logout() {
  const router = useRouter();
  useEffect(() => { supabase.auth.signOut().finally(() => router.replace('/login/')); }, [router]);
  return <div className="center muted">Signing out…</div>;
}
