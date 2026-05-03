import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area, Legend
} from "recharts";

// ── Hard-coded insights from the Python pipeline ──────────────────────────────
const DATA = {
  stats: { raw: { rows: 525, cols: 10 }, duplicates_removed: 25, invalid_ages_removed: 4, salary_outliers_capped: 26, clean: { rows: 500, cols: 12 }, missing_after: 0 },
  summary: { avg_salary: 84483, median_salary: 84300, avg_age: 43.2, avg_tenure: 14.0, avg_perf: 3.31, remote_pct: 45.2 },
  by_dept: [
    { department: "Finance",     avg_salary: 86930, count: 68,  avg_perf: 3.17 },
    { department: "Sales",       avg_salary: 85370, count: 91,  avg_perf: 3.39 },
    { department: "HR",          avg_salary: 85164, count: 62,  avg_perf: 3.47 },
    { department: "Operations",  avg_salary: 84603, count: 68,  avg_perf: 3.37 },
    { department: "Marketing",   avg_salary: 84303, count: 65,  avg_perf: 3.06 },
    { department: "Engineering", avg_salary: 81684, count: 116, avg_perf: 3.33 },
  ],
  perf_dist: [
    { score: "★ 1", count: 39 },
    { score: "★★ 2", count: 71 },
    { score: "★★★ 3", count: 145 },
    { score: "★★★★ 4", count: 144 },
    { score: "★★★★★ 5", count: 77 },
  ],
  remote_dist: [
    { label: "Remote", value: 226 },
    { label: "On-Site", value: 157 },
    { label: "Unknown", value: 117 },
  ],
  salary_band: [
    { band: "Entry\n<$60k", count: 53 },
    { band: "Mid\n$60–90k", count: 225 },
    { band: "Senior\n$90–120k", count: 151 },
    { band: "Executive\n>$120k", count: 20 },
  ],
  age_bins: [
    { range: "18–25", count: 37 },
    { range: "25–35", count: 113 },
    { range: "35–45", count: 100 },
    { range: "45–55", count: 117 },
    { range: "55–65", count: 93 },
  ],
  pipeline: [
    { step: "Raw Data Ingestion",      action: "Loaded CSV",                          issue: "525 rows, 10 cols, mixed types",        fixed: 525 },
    { step: "Duplicate Detection",     action: "drop_duplicates()",                   issue: "25 exact duplicate rows found",         fixed: 25  },
    { step: "Column Standardisation",  action: "str.upper() + map()",                 issue: "remote_work had 5 variants",            fixed: 64  },
    { step: "Outlier Removal",         action: "IQR method on salary",                issue: "26 extreme salary outliers",            fixed: 26  },
    { step: "Invalid Value Removal",   action: "Range filter on age [18,80]",         issue: "4 impossible ages (−5, 150, 200, 999)", fixed: 4   },
    { step: "Missing Value Imputation",action: "Median / mode / group-median fill",   issue: "188 nulls across 6 columns",            fixed: 188 },
    { step: "Feature Engineering",     action: "salary_band + tenure_years derived",  issue: "No derived features existed",           fixed: 2   },
  ]
};

const PALETTE = {
  teal:   "#00C9B1",
  amber:  "#FFB547",
  coral:  "#FF6B6B",
  indigo: "#7C83FD",
  lime:   "#A8E063",
  pink:   "#F472B6",
  bg:     "#0B0F1A",
  card:   "#111827",
  border: "#1E2A3B",
  text:   "#E2E8F0",
  muted:  "#64748B",
};
const DEPT_COLORS  = [PALETTE.teal, PALETTE.amber, PALETTE.indigo, PALETTE.coral, PALETTE.lime, PALETTE.pink];
const REMOTE_COLORS = [PALETTE.teal, PALETTE.amber, PALETTE.muted];

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const fmt = (n, prefix = "") => `${prefix}${Number(n).toLocaleString()}`;
const Card = ({ children, className = "" }) => (
  <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16, padding: 24 }} className={className}>
    {children}
  </div>
);
const SectionTitle = ({ children }) => (
  <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 4, color: PALETTE.teal, textTransform: "uppercase", marginBottom: 20 }}>
    {children}
  </h2>
);

// ── Stat KPI card ─────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color = PALETTE.teal }) {
  return (
    <Card>
      <div style={{ fontSize: 11, letterSpacing: 3, color: PALETTE.muted, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 6 }}>{sub}</div>}
    </Card>
  );
}

// ── Pipeline step row ─────────────────────────────────────────────────────────
function PipelineRow({ step, action, issue, fixed, idx, active, onClick }) {
  const colors = [PALETTE.teal, PALETTE.indigo, PALETTE.amber, PALETTE.coral, PALETTE.lime, PALETTE.pink, PALETTE.teal];
  const c = colors[idx % colors.length];
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "14px 16px", borderRadius: 10, cursor: "pointer", background: active ? `${c}18` : "transparent", border: `1px solid ${active ? c : PALETTE.border}`, marginBottom: 8, transition: "all .2s" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#000", flexShrink: 0 }}>{idx + 1}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: PALETTE.text, fontSize: 13 }}>{step}</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: c, marginTop: 3 }}>{action}</div>
        {active && <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 6 }}>⚠ {issue} → <span style={{ color: c }}>+{fixed} records fixed</span></div>}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: c, flexShrink: 0 }}>+{fixed}</div>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a2236", border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: PALETTE.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || PALETTE.teal, fontWeight: 700 }}>{prefix}{Number(p.value).toLocaleString()}{suffix}</div>
      ))}
    </div>
  );
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [activePipe, setActivePipe] = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

  const tabs = [
    { id: "overview",  label: "Overview" },
    { id: "pipeline",  label: "🔧 Cleaning Pipeline" },
    { id: "salary",    label: "💰 Salary Analysis" },
    { id: "people",    label: "👥 People Insights" },
  ];

  const deptRadar = DATA.by_dept.map(d => ({
    dept: d.department.slice(0, 4),
    Salary: Math.round(d.avg_salary / 1000),
    Perf: d.avg_perf * 20,
    Count: Math.round(d.count / 2),
  }));

  return (
    <div style={{ minHeight: "100vh", background: PALETTE.bg, color: PALETTE.text, fontFamily: "'Inter', sans-serif", padding: "0 0 60px" }}>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg, #0B0F1A 0%, #0d1829 100%)", borderBottom: `1px solid ${PALETTE.border}`, padding: "28px 32px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: PALETTE.teal, boxShadow: `0 0 10px ${PALETTE.teal}` }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 4, color: PALETTE.teal, textTransform: "uppercase" }}>Data Analytics Report</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, margin: "0 0 2px", background: `linear-gradient(90deg, ${PALETTE.text}, ${PALETTE.teal})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Employee Dataset — Cleaned & Visualised
          </h1>
          <p style={{ color: PALETTE.muted, fontSize: 13, margin: "0 0 24px" }}>500 employees · 6 departments · Python/Pandas pipeline</p>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 20px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all .2s", background: tab === t.id ? PALETTE.card : "transparent", color: tab === t.id ? PALETTE.teal : PALETTE.muted, borderBottom: tab === t.id ? `2px solid ${PALETTE.teal}` : "2px solid transparent" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "32px auto", padding: "0 32px" }}>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div style={{ opacity: animated ? 1 : 0, transform: animated ? "none" : "translateY(10px)", transition: "all .4s" }}>
            <SectionTitle>Key Metrics</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 28 }}>
              <KPI label="Avg Salary"    value={`$${Math.round(DATA.summary.avg_salary/1000)}k`}  sub="post-cleaning" color={PALETTE.teal}   />
              <KPI label="Median Salary" value={`$${Math.round(DATA.summary.median_salary/1000)}k`} sub="robust estimate" color={PALETTE.indigo} />
              <KPI label="Avg Age"       value={`${DATA.summary.avg_age}`}  sub="years"                color={PALETTE.amber}  />
              <KPI label="Avg Tenure"    value={`${DATA.summary.avg_tenure}y`} sub="company tenure"    color={PALETTE.coral}  />
              <KPI label="Avg Perf"      value={DATA.summary.avg_perf}  sub="out of 5"                 color={PALETTE.lime}   />
              <KPI label="Remote Work"   value={`${DATA.summary.remote_pct}%`} sub="of workforce"     color={PALETTE.pink}   />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* Dept salary bar */}
              <Card>
                <SectionTitle>Avg Salary by Department</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={DATA.by_dept} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                    <XAxis dataKey="department" tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <Tooltip content={<CustomTip prefix="$" />} />
                    <Bar dataKey="avg_salary" radius={[4,4,0,0]}>
                      {DATA.by_dept.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Remote pie */}
              <Card>
                <SectionTitle>Remote Work Distribution</SectionTitle>
                <div style={{ display: "flex", alignItems: "center", height: 240 }}>
                  <ResponsiveContainer width="60%" height={220}>
                    <PieChart>
                      <Pie data={DATA.remote_dist} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {DATA.remote_dist.map((_, i) => <Cell key={i} fill={REMOTE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1 }}>
                    {DATA.remote_dist.map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: REMOTE_COLORS[i] }} />
                        <span style={{ fontSize: 12, color: PALETTE.muted }}>{d.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: REMOTE_COLORS[i], marginLeft: "auto" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Dept radar */}
            <Card>
              <SectionTitle>Department Radar — Salary vs Performance vs Headcount</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={deptRadar} cx="50%" cy="50%" outerRadius={100}>
                  <PolarGrid stroke={PALETTE.border} />
                  <PolarAngleAxis dataKey="dept" tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                  <Radar name="Salary (÷1k)" dataKey="Salary" stroke={PALETTE.teal}   fill={PALETTE.teal}   fillOpacity={0.15} />
                  <Radar name="Perf (×20)"   dataKey="Perf"   stroke={PALETTE.amber}  fill={PALETTE.amber}  fillOpacity={0.15} />
                  <Radar name="Count (÷2)"   dataKey="Count"  stroke={PALETTE.indigo} fill={PALETTE.indigo} fillOpacity={0.15} />
                  <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                  <Tooltip content={<CustomTip />} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ── PIPELINE TAB ── */}
        {tab === "pipeline" && (
          <div style={{ opacity: animated ? 1 : 0, transition: "all .4s" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
              <KPI label="Raw Rows"    value={DATA.stats.raw.rows}                 sub="before cleaning"  color={PALETTE.coral}  />
              <KPI label="Clean Rows"  value={DATA.stats.clean.rows}               sub="after cleaning"   color={PALETTE.teal}   />
              <KPI label="Duplicates"  value={DATA.stats.duplicates_removed}       sub="removed"          color={PALETTE.amber}  />
              <KPI label="Outliers"    value={DATA.stats.salary_outliers_capped}   sub="salary capped"    color={PALETTE.indigo} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <SectionTitle>Cleaning Steps — Click to Expand</SectionTitle>
                {DATA.pipeline.map((p, i) => (
                  <PipelineRow key={i} {...p} idx={i} active={activePipe === i} onClick={() => setActivePipe(activePipe === i ? null : i)} />
                ))}
              </div>

              <Card>
                <SectionTitle>Issues Fixed per Step</SectionTitle>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={DATA.pipeline} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} horizontal={false} />
                    <XAxis type="number" tick={{ fill: PALETTE.muted, fontSize: 10 }} />
                    <YAxis type="category" dataKey="step" width={140} tick={{ fill: PALETTE.muted, fontSize: 10 }} />
                    <Tooltip content={<CustomTip suffix=" records" />} />
                    <Bar dataKey="fixed" radius={[0,4,4,0]}>
                      {DATA.pipeline.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div style={{ marginTop: 20, padding: "14px 16px", background: "#0B0F1A", borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 11, color: PALETTE.muted, lineHeight: 1.8 }}>
                  <span style={{ color: PALETTE.teal }}>$ python clean_and_analyze.py</span><br />
                  <span style={{ color: PALETTE.lime }}>✓</span> Duplicates removed: <span style={{ color: PALETTE.amber }}>25</span><br />
                  <span style={{ color: PALETTE.lime }}>✓</span> Salary outliers capped: <span style={{ color: PALETTE.amber }}>26</span><br />
                  <span style={{ color: PALETTE.lime }}>✓</span> Invalid ages removed: <span style={{ color: PALETTE.amber }}>4</span><br />
                  <span style={{ color: PALETTE.lime }}>✓</span> Missing values filled: <span style={{ color: PALETTE.amber }}>188</span><br />
                  <span style={{ color: PALETTE.lime }}>✓</span> Features engineered: <span style={{ color: PALETTE.amber }}>2</span><br />
                  <span style={{ color: PALETTE.teal }}>→ clean_employee_data.csv saved</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── SALARY TAB ── */}
        {tab === "salary" && (
          <div style={{ opacity: animated ? 1 : 0, transition: "all .4s" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <Card>
                <SectionTitle>Salary Bands Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={DATA.salary_band} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                    <XAxis dataKey="band" tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <YAxis tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <Tooltip content={<CustomTip suffix=" employees" />} />
                    <Bar dataKey="count" radius={[4,4,0,0]}>
                      {DATA.salary_band.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionTitle>Performance Score Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={DATA.perf_dist} margin={{ left: -10 }}>
                    <defs>
                      <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE.indigo} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={PALETTE.indigo} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                    <XAxis dataKey="score" tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <YAxis tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <Tooltip content={<CustomTip suffix=" employees" />} />
                    <Area type="monotone" dataKey="count" stroke={PALETTE.indigo} fill="url(#perfGrad)" strokeWidth={2} dot={{ fill: PALETTE.indigo, r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card>
              <SectionTitle>Department — Avg Salary vs Avg Performance Score</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={DATA.by_dept} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                  <XAxis dataKey="department" tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                  <YAxis yAxisId="l" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                  <YAxis yAxisId="r" orientation="right" domain={[2.8, 3.6]} tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                  <Tooltip content={<CustomTip />} />
                  <Bar yAxisId="l" dataKey="avg_salary" name="Avg Salary" radius={[4,4,0,0]} fill={PALETTE.teal} fillOpacity={0.8} />
                  <Bar yAxisId="r" dataKey="avg_perf"   name="Avg Perf"   radius={[4,4,0,0]} fill={PALETTE.amber} fillOpacity={0.8} />
                  <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ── PEOPLE TAB ── */}
        {tab === "people" && (
          <div style={{ opacity: animated ? 1 : 0, transition: "all .4s" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <Card>
                <SectionTitle>Age Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={DATA.age_bins} margin={{ left: -10 }}>
                    <defs>
                      <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE.coral} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={PALETTE.coral} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                    <XAxis dataKey="range" tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <YAxis tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <Tooltip content={<CustomTip suffix=" employees" />} />
                    <Area type="monotone" dataKey="count" stroke={PALETTE.coral} fill="url(#ageGrad)" strokeWidth={2} dot={{ fill: PALETTE.coral, r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionTitle>Headcount by Department</SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[...DATA.by_dept].sort((a,b) => b.count - a.count)} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} horizontal={false} />
                    <XAxis type="number" tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <YAxis type="category" dataKey="department" width={90} tick={{ fill: PALETTE.muted, fontSize: 11 }} />
                    <Tooltip content={<CustomTip suffix=" employees" />} />
                    <Bar dataKey="count" radius={[0,4,4,0]}>
                      {DATA.by_dept.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Perf by dept table */}
            <Card>
              <SectionTitle>Department Scorecard</SectionTitle>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${PALETTE.border}` }}>
                    {["Department", "Headcount", "Avg Salary", "Avg Performance", "Salary Band"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: PALETTE.muted, fontWeight: 500, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DATA.by_dept.map((d, i) => {
                    const stars = "★".repeat(Math.round(d.avg_perf)) + "☆".repeat(5 - Math.round(d.avg_perf));
                    const c = DEPT_COLORS[i];
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${PALETTE.border}`, transition: "background .15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = `${c}10`}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 12px", fontWeight: 700 }}>
                          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 8 }} />
                          {d.department}
                        </td>
                        <td style={{ padding: "12px 12px", color: PALETTE.muted }}>{d.count}</td>
                        <td style={{ padding: "12px 12px", color: c, fontWeight: 700 }}>${Math.round(d.avg_salary).toLocaleString()}</td>
                        <td style={{ padding: "12px 12px" }}>
                          <span style={{ color: PALETTE.amber, fontSize: 14 }}>{stars}</span>
                          <span style={{ color: PALETTE.muted, marginLeft: 8 }}>{d.avg_perf.toFixed(2)}</span>
                        </td>
                        <td style={{ padding: "12px 12px", color: PALETTE.muted }}>
                          {d.avg_salary > 86000 ? "Senior" : d.avg_salary > 84000 ? "Mid–Senior" : "Mid"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
