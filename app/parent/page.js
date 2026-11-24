'use client';
import Shell from '../../components/Shell';

const ROLES = ['parent'];

export default function Parent() {
  return (
    <Shell title="My children" subtitle="Coming soon" roles={ROLES}>
      <div className="card"><h2>Parent portal</h2><p className="muted">Attendance, progress and fees for your children will appear here soon.</p></div>
    </Shell>
  );
}
