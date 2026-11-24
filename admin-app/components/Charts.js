'use client';
// Small dependency-free SVG charts.
export function BarChart({ data, series, height = 220 }) {
  // data: [{label, a, b}] ; series: [{key,label,color}]
  const W = 560, H = height, pad = { l: 44, r: 10, t: 10, b: 38 };
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key] || 0))));
  const nice = (m) => { const p = Math.pow(10, Math.floor(Math.log10(m))); const n = m / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
  const top = nice(max);
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const gw = iw / Math.max(data.length, 1);
  const bw = Math.min(26, (gw * 0.7) / series.length);
  const y = (v) => pad.t + ih - (v / top) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * top);
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" opacity=".1" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="currentColor" opacity=".6">{Math.round(t).toLocaleString()}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x0 = pad.l + gw * i + (gw - bw * series.length) / 2;
          return (
            <g key={d.label}>
              {series.map((s, j) => {
                const v = Number(d[s.key] || 0);
                return <rect key={s.key} x={x0 + j * bw} y={y(v)} width={bw - 2} height={Math.max(0, pad.t + ih - y(v))} rx="4" fill={s.color}><title>{`${d.label} · ${s.label}: ${v.toLocaleString()}`}</title></rect>;
              })}
              <text x={pad.l + gw * i + gw / 2} y={H - 14} textAnchor="middle" fontSize="10.5" fill="currentColor" opacity=".7">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend">{series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}</div>
    </div>
  );
}

export function Donut({ value, total, color = '#1e95e9', label }) {
  const r = 38, c = 2 * Math.PI * r, p = total ? Math.min(1, value / total) : 0;
  return (
    <svg viewBox="0 0 100 100" width="96" height="96" role="img" aria-label={label}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" opacity=".1" strokeWidth="12" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 50 50)" />
      <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor">{Math.round(p * 100)}%</text>
    </svg>
  );
}
