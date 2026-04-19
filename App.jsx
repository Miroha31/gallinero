import { useState, useEffect, useCallback } from "react";

// ── SUPABASE CLIENT ──────────────────────────────────────────
const SUPABASE_URL = "https://krqhqzyonohwahrwnunc.supabase.co";
const SUPABASE_KEY = "sb_publishable_PWlEYE65xaxnLKQNcHDnrA_v_eWr-bj";

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const db = {
  get: (table, query = "") => sb(`${table}?${query}&order=created_at.desc`),
  insert: (table, data) => sb(table, { method: "POST", body: JSON.stringify(data) }),
  update: (table, id, data) => sb(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (table, id) => sb(`${table}?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  upsert: (table, data) => sb(table, { method: "POST", body: JSON.stringify(data), headers: { "Prefer": "resolution=merge-duplicates,return=representation" } }),
};

// ── HELPERS ──────────────────────────────────────────────────
const getConsumo = (config) => {
  const total = 0.113;
  const pctB = (config?.pctBalanceado ?? 75) / 100;
  const pctG = (config?.pctGranos ?? 25) / 100;
  return { balanceado: total * pctB, granos: total * pctG, vitaminas: 0, otro: 0 };
};

const estimarAgotamiento = (item, nGallinas, config) => {
  const CONSUMO = getConsumo(config);
  const c = CONSUMO[item.tipo] * nGallinas;
  if (!c || !item.fecha_compra || !item.cantidad) return null;
  const dias = Math.floor(Number(item.cantidad) / c);
  const fecha = new Date(item.fecha_compra);
  fecha.setDate(fecha.getDate() + dias);
  const restantes = Math.floor((fecha - new Date()) / 86400000);
  return { fechaAgota: fecha.toISOString().split("T")[0], restantes, dias, consumoDia: c.toFixed(2) };
};

const hoy = () => new Date().toISOString().split("T")[0];

const Icon = ({ name, size = 18 }) => {
  const M = { egg: "🥚", chicken: "🐔", feed: "🌾", money: "💰", chart: "📊", plus: "➕", home: "🏠", warning: "⚠️", bell: "🔔" };
  return <span style={{ fontSize: size }}>{M[name] || "•"}</span>;
};

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: "chart" },
  { id: "gallinas", label: "Gallinas", icon: "chicken" },
  { id: "huevos", label: "Huevos", icon: "egg" },
  { id: "alimento", label: "Alimento", icon: "feed" },
  { id: "finanzas", label: "Pedidos y Finanzas", icon: "money" },
  { id: "clientes", label: "Clientes", icon: "egg" },
];

// ── STYLES ───────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: "#f7f9fc", fontFamily: "Arial,sans-serif", color: "#1a1a2e" },
  header: { background: "linear-gradient(90deg,#ff6b35,#f7931e)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(255,107,53,0.3)" },
  hTitle: { fontSize: 22, fontWeight: "bold", color: "#ffffff", letterSpacing: 1, margin: 0 },
  nav: { display: "flex", overflowX: "auto", background: "#ffffff", borderBottom: "2px solid #f0f0f0", padding: "0 8px", gap: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  nb: (a) => ({ padding: "10px 14px", background: a ? "rgba(255,107,53,0.08)" : "transparent", border: "none", borderBottom: a ? "2px solid #ff6b35" : "2px solid transparent", color: a ? "#ff6b35" : "#888", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", fontFamily: "Arial,sans-serif", fontWeight: a ? "bold" : "normal", display: "flex", alignItems: "center", gap: 4 }),
  main: { padding: 20, maxWidth: 900, margin: "0 auto" },
  card: { background: "#ffffff", border: "1px solid #e8edf2", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  ct: { fontSize: 13, fontWeight: "bold", color: "#ff6b35", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  sb: { background: "linear-gradient(135deg,#fff8f5,#fff3ee)", border: "1px solid #ffd5c2", borderRadius: 10, padding: 16, textAlign: "center" },
  sv: { fontSize: 28, fontWeight: "bold", color: "#ff6b35" },
  sl: { fontSize: 11, color: "#999", marginTop: 4 },
  inp: { width: "100%", background: "#f7f9fc", border: "1px solid #dde3ea", borderRadius: 6, padding: "8px 12px", color: "#1a1a2e", fontSize: 13, fontFamily: "Arial,sans-serif", boxSizing: "border-box" },
  lbl: { fontSize: 11, color: "#888", marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5 },
  btn: (v = "primary") => ({ padding: "9px 18px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "Arial,sans-serif", fontWeight: "bold", background: v === "primary" ? "#ff6b35" : v === "success" ? "#2ecc71" : v === "danger" ? "#e74c3c" : "#f0f0f0", color: v === "ghost" ? "#888" : "#ffffff" }),
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 10px", background: "#fff8f5", color: "#ff6b35", textAlign: "left", borderBottom: "2px solid #ffd5c2", fontSize: 11, textTransform: "uppercase" },
  td: { padding: "8px 10px", borderBottom: "1px solid #f0f0f0", color: "#333" },
  bdg: (c) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: "bold", background: c === "green" ? "#e8f8f0" : c === "red" ? "#fdecea" : "#fff3e0", color: c === "green" ? "#27ae60" : c === "red" ? "#e74c3c" : "#f39c12", border: `1px solid ${c === "green" ? "#a8e6c8" : c === "red" ? "#f5b7b1" : "#fad7a0"}` }),
  alrt: (t) => ({ padding: "10px 14px", borderRadius: 8, marginBottom: 8, fontSize: 12, background: t === "warn" ? "#fffbea" : t === "danger" ? "#fdecea" : "#e8f8f0", border: `1px solid ${t === "warn" ? "#f9ca24" : t === "danger" ? "#f5b7b1" : "#a8e6c8"}`, color: t === "warn" ? "#d4930a" : t === "danger" ? "#c0392b" : "#27ae60", display: "flex", alignItems: "flex-start", gap: 8 }),
  prog: { height: 10, borderRadius: 5, background: "#f0f0f0", overflow: "hidden", marginTop: 6 },
  pbar: (p) => ({ height: "100%", width: `${Math.min(p, 100)}%`, background: p > 85 ? "#e74c3c" : p > 60 ? "#f39c12" : "#2ecc71", borderRadius: 5 }),
};

const Field = ({ label, children }) => <div style={{ marginBottom: 12 }}><label style={S.lbl}>{label}</label>{children}</div>;

const Spinner = () => <div style={{ textAlign: "center", padding: 40, color: "#ff6b35", fontSize: 14 }}>Cargando...</div>;

// ── DASHBOARD ────────────────────────────────────────────────
function Dashboard({ data }) {
  const { gallinas, huevos, finanzas, alimento, config, gallinero } = data;
  const nG = gallinas.filter(g => g.activa).length;
  const ocup = Math.round((nG / (gallinero.capacidad_max || 100)) * 100);
  const today = hoy();
  const mes = today.slice(0, 7);
  const anio = today.slice(0, 4);

  const huevosHoy = huevos.filter(h => h.fecha === today).reduce((s, h) => s + Number(h.cantidad), 0);
  const huevosMes = huevos.filter(h => h.fecha?.startsWith(mes)).reduce((s, h) => s + Number(h.cantidad), 0);
  const huevosAnio = huevos.filter(h => h.fecha?.startsWith(anio)).reduce((s, h) => s + Number(h.cantidad), 0);

  const ing = finanzas.filter(c => c.tipo === "ingreso" && c.fecha?.startsWith(mes)).reduce((s, c) => s + Number(c.monto), 0);
  const gas = finanzas.filter(c => c.tipo === "gasto" && c.fecha?.startsWith(mes)).reduce((s, c) => s + Number(c.monto), 0);
  const ingAnio = finanzas.filter(c => c.tipo === "ingreso" && c.fecha?.startsWith(anio)).reduce((s, c) => s + Number(c.monto), 0);
  const gasAnio = finanzas.filter(c => c.tipo === "gasto" && c.fecha?.startsWith(anio)).reduce((s, c) => s + Number(c.monto), 0);
  const tI = finanzas.filter(c => c.tipo === "ingreso").reduce((s, c) => s + Number(c.monto), 0);
  const tG = finanzas.filter(c => c.tipo === "gasto").reduce((s, c) => s + Number(c.monto), 0);
  const invTotal = finanzas.filter(c => c.tipo === "inversion").reduce((s, c) => s + Number(c.monto), 0);

  const diasConDatosMes = new Set(huevos.filter(h => h.fecha?.startsWith(mes)).map(h => h.fecha)).size;
  const diasConDatosAnio = new Set(huevos.filter(h => h.fecha?.startsWith(anio)).map(h => h.fecha)).size;
  const promDiarioMes = diasConDatosMes > 0 ? (huevosMes / diasConDatosMes).toFixed(1) : 0;
  const promDiarioAnio = diasConDatosAnio > 0 ? (huevosAnio / diasConDatosAnio).toFixed(1) : 0;

  const mesesConDatos = new Set(finanzas.filter(c => c.fecha?.startsWith(anio)).map(c => c.fecha?.slice(0, 7))).size;
  const promUtilidadMensual = mesesConDatos > 0 ? Math.round((ingAnio - gasAnio) / mesesConDatos) : 0;

  const nGBase = nG || 30;
  const tasaPostura = nGBase > 0 && huevosHoy > 0 ? Math.round((huevosHoy / nGBase) * 100) : null;
  const costoPorHuevo = huevosMes > 0 && gas > 0 ? (gas / huevosMes).toFixed(2) : null;
  const costoPorDocena = huevosMes > 0 && gas > 0 ? (gas / (huevosMes / 12)).toFixed(2) : null;
  const paybackMeses = promUtilidadMensual > 0 ? Math.ceil(invTotal / promUtilidadMensual) : null;
  const netProfitMargin = ing > 0 ? (((ing - gas) / ing) * 100).toFixed(1) : null;
  const avgRevenuePerHen = tI > 0 && nGBase > 0 ? (tI / nGBase).toFixed(0) : null;

  const bajasMuerteAnio = gallinas.filter(g => !g.activa && g.fecha_baja?.startsWith(anio) && ["muerte", "enfermedad", "depredador"].includes(g.causa_baja)).length;
  const mortalityRate = gallinas.length > 0 ? ((bajasMuerteAnio / gallinas.length) * 100).toFixed(1) : null;

  const diasConHuevos = new Set(huevos.map(h => h.fecha)).size;
  const totalGallinasDias = nGBase * diasConHuevos;
  const productionPct = totalGallinasDias > 0 ? ((huevos.reduce((s, h) => s + Number(h.cantidad), 0) / totalGallinasDias) * 100).toFixed(1) : null;

  const ultimoRegistro = huevos.length > 0 ? [...huevos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha : null;
  const diasSinRegistro = ultimoRegistro ? Math.floor((new Date(today) - new Date(ultimoRegistro)) / 86400000) : null;

  const diasAlerta = config?.diasAlerta ?? 2;
  const alertasAlimento = alimento.filter(a => a.estado === "disponible").map(a => ({ ...a, est: estimarAgotamiento(a, nGBase, config) })).filter(a => a.est && a.est.restantes <= diasAlerta);
  const enfermas = gallinas.filter(g => g.activa && g.estado === "enferma").length;

  const u7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const f = d.toISOString().split("T")[0];
    return { f: f.slice(5), t: huevos.filter(h => h.fecha === f).reduce((s, h) => s + Number(h.cantidad), 0) };
  }).reverse();

  return <div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
      <div style={S.sb}><div style={{ ...S.sv, fontSize: 20, color: tasaPostura >= 75 ? "#27ae60" : tasaPostura >= 60 ? "#f39c12" : "#e74c3c" }}>{tasaPostura !== null ? tasaPostura + "%" : "—"}</div><div style={S.sl}>🎯 Tasa postura</div><div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>Meta: &gt;75%</div></div>
      <div style={S.sb}><div style={{ ...S.sv, fontSize: 20, color: productionPct >= 75 ? "#27ae60" : "#f39c12" }}>{productionPct ? productionPct + "%" : "—"}</div><div style={S.sl}>📊 Production %</div></div>
      <div style={S.sb}><div style={{ ...S.sv, fontSize: 20, color: mortalityRate <= 5 ? "#27ae60" : "#e74c3c" }}>{mortalityRate ? mortalityRate + "%" : "0%"}</div><div style={S.sl}>💀 Mortality</div><div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>Meta: &lt;5%</div></div>
      <div style={{ ...S.sb, background: diasSinRegistro > 1 ? "#fdecea" : "#e8f8f0", border: `1px solid ${diasSinRegistro > 1 ? "#f5b7b1" : "#a8e6c8"}` }}><div style={{ ...S.sv, fontSize: 20, color: diasSinRegistro > 1 ? "#e74c3c" : "#27ae60" }}>{diasSinRegistro !== null ? diasSinRegistro + "d" : "—"}</div><div style={S.sl}>📋 Sin registrar</div></div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
      <div style={S.sb}><div style={{ ...S.sv, fontSize: 18 }}>{costoPorHuevo ? "$" + costoPorHuevo : "—"}</div><div style={S.sl}>💡 Costo/huevo</div></div>
      <div style={S.sb}><div style={{ ...S.sv, fontSize: 18 }}>{costoPorDocena ? "$" + costoPorDocena : "—"}</div><div style={S.sl}>🥚 Costo/docena</div></div>
      <div style={S.sb}><div style={{ ...S.sv, fontSize: 18, color: "#ff6b35" }}>{avgRevenuePerHen ? "$" + Number(avgRevenuePerHen).toLocaleString() : "—"}</div><div style={S.sl}>🐔 Rev/gallina</div></div>
      <div style={S.sb}><div style={{ ...S.sv, fontSize: 18, color: netProfitMargin >= 15 ? "#27ae60" : "#f39c12" }}>{netProfitMargin ? netProfitMargin + "%" : "—"}</div><div style={S.sl}>💰 Net Margin</div></div>
      <div style={S.sb}><div style={{ ...S.sv, fontSize: 18 }}>{paybackMeses ? paybackMeses + " m" : "—"}</div><div style={S.sl}>📅 Payback</div></div>
      <div style={S.sb}><div style={{ ...S.sv, fontSize: 18, color: invTotal > 0 ? "#ff6b35" : "#aaa" }}>${invTotal.toLocaleString()}</div><div style={S.sl}>🏗️ Inversión</div></div>
    </div>

    <div style={S.g3}>
      <div style={S.sb}><div style={S.sv}>{nG}</div><div style={S.sl}>🐔 Gallinas activas</div><div style={{ borderTop: "1px solid #ffd5c2", marginTop: 8, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}><div><div style={{ fontSize: 13, fontWeight: "bold", color: "#ff6b35" }}>{gallinas.filter(g => !g.activa).length}</div><div style={{ fontSize: 10, color: "#aaa" }}>Bajas</div></div><div><div style={{ fontSize: 13, fontWeight: "bold", color: "#ff6b35" }}>{(gallinero.capacidad_max || 100) - nG}</div><div style={{ fontSize: 10, color: "#aaa" }}>Espacio libre</div></div></div></div>
      <div style={S.sb}><div style={S.sv}>{huevosHoy}</div><div style={S.sl}>🥚 Huevos hoy</div><div style={{ borderTop: "1px solid #ffd5c2", marginTop: 8, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}><div><div style={{ fontSize: 13, fontWeight: "bold", color: "#ff6b35" }}>{huevosMes}</div><div style={{ fontSize: 10, color: "#aaa" }}>Total mes</div></div><div><div style={{ fontSize: 13, fontWeight: "bold", color: "#f39c12" }}>{promDiarioMes}</div><div style={{ fontSize: 10, color: "#aaa" }}>Prom/día</div></div></div></div>
      <div style={S.sb}><div style={{ ...S.sv, color: ing - gas >= 0 ? "#27ae60" : "#e74c3c" }}>${(ing - gas).toLocaleString()}</div><div style={S.sl}>💰 Utilidad mes</div><div style={{ borderTop: "1px solid #ffd5c2", marginTop: 8, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}><div><div style={{ fontSize: 13, fontWeight: "bold", color: ingAnio - gasAnio >= 0 ? "#27ae60" : "#e74c3c" }}>${(ingAnio - gasAnio).toLocaleString()}</div><div style={{ fontSize: 10, color: "#aaa" }}>Utilidad año</div></div><div><div style={{ fontSize: 13, fontWeight: "bold", color: promUtilidadMensual >= 0 ? "#27ae60" : "#e74c3c" }}>${promUtilidadMensual.toLocaleString()}</div><div style={{ fontSize: 10, color: "#aaa" }}>Prom mensual</div></div></div></div>
    </div>

    {(alertasAlimento.length > 0 || enfermas > 0) && <div style={{ ...S.card, marginTop: 16 }}>
      <div style={S.ct}><Icon name="warning" /> Alertas</div>
      {alertasAlimento.map(a => <div key={a.id} style={S.alrt(a.est.restantes <= 0 ? "danger" : "warn")}><Icon name="feed" /><div><strong>{a.tipo}</strong> — {a.est.restantes <= 0 ? "¡Se acabó!" : `${a.est.restantes} día(s) restantes`}</div></div>)}
      {enfermas > 0 && <div style={S.alrt("warn")}><Icon name="warning" /> {enfermas} gallina(s) enferma(s)</div>}
    </div>}

    <div style={S.card}>
      <div style={S.ct}><Icon name="egg" /> Últimos 7 días</div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 70 }}>
        {u7.map((d, i) => { const max = Math.max(...u7.map(x => x.t), 1); const h = Math.round((d.t / max) * 60); return <div key={i} style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 10, color: "#ff6b35", marginBottom: 2 }}>{d.t || ""}</div><div style={{ height: h || 4, background: d.t ? "#ff6b35" : "#f0f0f0", borderRadius: 3 }} /><div style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>{d.f}</div></div>; })}
      </div>
    </div>

    <div style={S.card}>
      <div style={S.ct}><Icon name="home" /> Ocupación</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>{nG} / {gallinero.capacidad_max || 100} gallinas — {gallinero.largo}m × {gallinero.ancho}m</div>
      <div style={S.prog}><div style={S.pbar(ocup)} /></div>
      <div style={{ fontSize: 12, color: "#ff6b35", marginTop: 4 }}>{ocup}% ocupado</div>
    </div>
  </div>;
}

// ── GALLINAS ─────────────────────────────────────────────────
function Gallinas({ data, reload }) {
  const [form, setForm] = useState({ tag: "", raza: "Rhode Island Red", fecha_nacimiento: "", estado: "sana", notas: "" });
  const [bajaId, setBajaId] = useState(null);
  const [causaBaja, setCausaBaja] = useState("muerte");
  const [loading, setLoading] = useState(false);

  const agregar = async () => {
    if (!form.tag) return;
    setLoading(true);
    try { await db.insert("gallinas", { ...form, activa: true }); await reload("gallinas"); setForm({ tag: "", raza: "Rhode Island Red", fecha_nacimiento: "", estado: "sana", notas: "" }); } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const confirmarBaja = async (id) => {
    setLoading(true);
    try { await db.update("gallinas", id, { activa: false, causa_baja: causaBaja, fecha_baja: hoy() }); await reload("gallinas"); setBajaId(null); } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const cambiarEstado = async (id, estado) => {
    try { await db.update("gallinas", id, { estado }); await reload("gallinas"); } catch (e) { alert("Error: " + e.message); }
  };

  const edad = (f) => { if (!f) return "—"; return Math.floor((Date.now() - new Date(f).getTime()) / 2592000000) + " meses"; };
  const inicioPosura = (f) => { if (!f) return "—"; const d = new Date(f); d.setDate(d.getDate() + 140); return d <= new Date() ? "✅ Ya pone" : d.toISOString().split("T")[0]; };

  const activas = data.gallinas.filter(g => g.activa);
  const bajas = data.gallinas.filter(g => !g.activa);

  return <div>
    <div style={S.card}>
      <div style={S.ct}><Icon name="plus" /> Registrar gallina</div>
      <div style={S.g2}>
        <Field label="Tag"><input style={S.inp} value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="G-031" /></Field>
        <Field label="Raza"><input style={S.inp} value={form.raza} onChange={e => setForm(f => ({ ...f, raza: e.target.value }))} /></Field>
        <Field label="Fecha nacimiento"><input type="date" style={S.inp} value={form.fecha_nacimiento} onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))} /></Field>
        <Field label="Estado"><select style={S.inp} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}><option value="sana">Sana</option><option value="enferma">Enferma</option><option value="en observación">En observación</option></select></Field>
      </div>
      <Field label="Notas"><input style={S.inp} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>
      <button style={S.btn()} onClick={agregar} disabled={loading}>Agregar gallina</button>
    </div>

    {bajaId && <div style={{ ...S.card, border: "2px solid #e74c3c", background: "#fdecea" }}>
      <div style={{ fontSize: 13, fontWeight: "bold", color: "#e74c3c", marginBottom: 12 }}>⚠️ Confirmar baja</div>
      <Field label="Causa"><select style={S.inp} value={causaBaja} onChange={e => setCausaBaja(e.target.value)}><option value="muerte">Muerte natural</option><option value="enfermedad">Enfermedad</option><option value="depredador">Depredador</option><option value="venta">Venta</option><option value="otro">Otro</option></select></Field>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={S.btn("danger")} onClick={() => confirmarBaja(bajaId)}>Confirmar</button>
        <button style={S.btn("ghost")} onClick={() => setBajaId(null)}>Cancelar</button>
      </div>
    </div>}

    <div style={S.card}>
      <div style={S.ct}><Icon name="chicken" /> {activas.length} activas / {bajas.length} bajas</div>
      {activas.length === 0 ? <div style={{ color: "#aaa", fontSize: 13 }}>Sin gallinas.</div> :
        <table style={S.tbl}><thead><tr><th style={S.th}>Tag</th><th style={S.th}>Edad</th><th style={S.th}>Inicio postura</th><th style={S.th}>Estado</th><th style={S.th}>Acción</th></tr></thead>
          <tbody>{activas.map(g => <tr key={g.id}>
            <td style={S.td}><span style={S.bdg("gold")}>{g.tag}</span></td>
            <td style={S.td}>{edad(g.fecha_nacimiento)}</td>
            <td style={{ ...S.td, color: inicioPosura(g.fecha_nacimiento) === "✅ Ya pone" ? "#27ae60" : "#333" }}>{inicioPosura(g.fecha_nacimiento)}</td>
            <td style={S.td}><select style={{ ...S.inp, padding: "3px 6px", width: "auto" }} value={g.estado} onChange={e => cambiarEstado(g.id, e.target.value)}><option value="sana">Sana</option><option value="enferma">Enferma</option><option value="en observación">En observación</option></select></td>
            <td style={S.td}><button style={{ ...S.btn("danger"), padding: "4px 10px", fontSize: 11 }} onClick={() => setBajaId(g.id)}>Dar de baja</button></td>
          </tr>)}</tbody></table>}
    </div>

    {bajas.length > 0 && <div style={S.card}>
      <div style={S.ct}>📉 Historial de bajas ({bajas.length})</div>
      <table style={S.tbl}><thead><tr><th style={S.th}>Tag</th><th style={S.th}>Fecha</th><th style={S.th}>Causa</th></tr></thead>
        <tbody>{bajas.map(g => <tr key={g.id}><td style={S.td}><span style={S.bdg("red")}>{g.tag}</span></td><td style={S.td}>{g.fecha_baja || "—"}</td><td style={S.td}><span style={S.bdg("red")}>{g.causa_baja || "—"}</span></td></tr>)}</tbody></table>
    </div>}
  </div>;
}

// ── HUEVOS ───────────────────────────────────────────────────
function Huevos({ data, reload }) {
  const [form, setForm] = useState({ fecha: hoy(), cantidad: "", notas: "" });
  const [loading, setLoading] = useState(false);

  const agregar = async () => {
    if (!form.cantidad) return;
    setLoading(true);
    try { await db.insert("huevos", { ...form, cantidad: Number(form.cantidad) }); await reload("huevos"); setForm(f => ({ ...f, cantidad: "", notas: "" })); } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const del = async (id) => {
    try { await db.delete("huevos", id); await reload("huevos"); } catch (e) { alert("Error: " + e.message); }
  };

  const mes = hoy().slice(0, 7);
  const totalMes = data.huevos.filter(h => h.fecha?.startsWith(mes)).reduce((s, h) => s + Number(h.cantidad), 0);
  const prom = data.huevos.length > 0 ? Math.round(data.huevos.reduce((s, h) => s + Number(h.cantidad), 0) / data.huevos.length) : 0;

  return <div>
    <div style={S.g2}>
      <div style={S.sb}><div style={S.sv}>{totalMes}</div><div style={S.sl}>🥚 Huevos este mes</div></div>
      <div style={S.sb}><div style={S.sv}>{prom}</div><div style={S.sl}>📊 Promedio diario</div></div>
    </div>
    <div style={{ ...S.card, marginTop: 16 }}>
      <div style={S.ct}><Icon name="plus" /> Registrar producción</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}><Field label="Fecha"><input type="date" style={S.inp} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Cantidad"><input type="number" style={S.inp} value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="0" /></Field></div>
        <div style={{ flex: 2 }}><Field label="Notas"><input style={S.inp} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field></div>
      </div>
      <button style={S.btn()} onClick={agregar} disabled={loading}>Registrar</button>
    </div>
    <div style={S.card}>
      <div style={S.ct}><Icon name="egg" /> Historial</div>
      <table style={S.tbl}><thead><tr><th style={S.th}>Fecha</th><th style={S.th}>Huevos</th><th style={S.th}>Notas</th><th style={S.th}></th></tr></thead>
        <tbody>{[...data.huevos].slice(0, 30).map(h => <tr key={h.id}><td style={S.td}>{h.fecha}</td><td style={S.td}><span style={{ ...S.bdg("gold"), fontSize: 12 }}>{h.cantidad}</span></td><td style={S.td}>{h.notas || "—"}</td><td style={S.td}><button style={{ ...S.btn("ghost"), padding: "2px 8px", fontSize: 11 }} onClick={() => del(h.id)}>✕</button></td></tr>)}</tbody></table>
    </div>
  </div>;
}

// ── ALIMENTO ─────────────────────────────────────────────────
function Alimento({ data, reload }) {
  const nG = data.gallinas.filter(g => g.activa).length || 30;
  const config = data.config || {};
  const CONSUMO = getConsumo(config);
  const pctB = config.pctBalanceado ?? 75;
  const pctG = config.pctGranos ?? 25;

  const toggle = async (id, estado) => {
    try { await db.update("alimento", id, { estado: estado === "disponible" ? "agotado" : "disponible" }); await reload("alimento"); } catch (e) { alert("Error: " + e.message); }
  };
  const del = async (id) => {
    try { await db.delete("alimento", id); await reload("alimento"); } catch (e) { alert("Error: " + e.message); }
  };
  const saveConfig = async (key, val) => {
    try { await db.upsert("config", { clave: key, valor: String(val) }); await reload("config"); } catch (e) { alert("Error: " + e.message); }
  };

  const consumoBalanceado = (CONSUMO.balanceado * nG).toFixed(2);
  const consumoGranos = (CONSUMO.granos * nG).toFixed(2);
  const diasBalanceado25 = Math.floor(25 / (CONSUMO.balanceado * nG));
  const diasGranos30 = Math.floor(30 / (CONSUMO.granos * nG));

  return <div>
    <div style={S.card}>
      <div style={S.ct}>📊 Consumo estimado ({nG} gallinas)</div>
      <div style={S.g2}>
        <div style={{ ...S.sb, padding: 12 }}><div style={{ fontSize: 20, fontWeight: "bold", color: "#ff6b35" }}>{consumoBalanceado} kg/día</div><div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Balanceado — bolsa 25kg dura <strong>~{diasBalanceado25} días</strong></div></div>
        <div style={{ ...S.sb, padding: 12 }}><div style={{ fontSize: 20, fontWeight: "bold", color: "#ff6b35" }}>{consumoGranos} kg/día</div><div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>8 Granos — costal 30kg dura <strong>~{diasGranos30} días</strong></div></div>
      </div>
    </div>
    <div style={S.card}>
      <div style={S.ct}>⚙️ Configuración</div>
      <div style={S.g2}>
        <Field label={`% Balanceado (actual: ${pctB}%)`}><input type="number" min="0" max="100" style={{ ...S.inp, width: 80 }} defaultValue={pctB} onBlur={e => { const b = Math.min(100, Math.max(0, Number(e.target.value))); saveConfig("pct_balanceado", b); saveConfig("pct_granos", 100 - b); }} /></Field>
        <Field label={`% Granos (calculado: ${pctG}%)`}><input type="number" style={{ ...S.inp, width: 80, background: "#f0f0f0" }} value={pctG} readOnly /></Field>
      </div>
      <Field label={`Avisar cuando queden __ días (actual: ${config.diasAlerta ?? 2})`}><input type="number" style={{ ...S.inp, width: 80 }} defaultValue={config.diasAlerta ?? 2} onBlur={e => saveConfig("dias_alerta", Number(e.target.value))} /></Field>
    </div>
    <div style={S.card}>
      <div style={S.ct}><Icon name="feed" /> Inventario</div>
      {data.alimento.length === 0 ? <div style={{ color: "#aaa", fontSize: 13 }}>Sin registros.</div> :
        <table style={S.tbl}><thead><tr><th style={S.th}>Tipo</th><th style={S.th}>Compra</th><th style={S.th}>Kg</th><th style={S.th}>Se acaba</th><th style={S.th}>Días</th><th style={S.th}>Estado</th><th style={S.th}></th></tr></thead>
          <tbody>{data.alimento.map(a => { const e = estimarAgotamiento(a, nG, config); const urg = e && e.restantes <= (config.diasAlerta ?? 2); return <tr key={a.id}><td style={S.td}>{a.tipo}</td><td style={S.td}>{a.fecha_compra}</td><td style={S.td}>{a.cantidad}</td><td style={{ ...S.td, color: urg ? "#e74c3c" : "#333" }}>{e ? e.fechaAgota : "—"}</td><td style={{ ...S.td, color: urg ? "#e74c3c" : "#27ae60" }}>{e ? (e.restantes <= 0 ? "¡HOY!" : e.restantes + "d") : "—"}</td><td style={S.td}><button style={S.bdg(a.estado === "disponible" ? "green" : "red")} onClick={() => toggle(a.id, a.estado)}>{a.estado === "disponible" ? "✓ Disponible" : "✗ Agotado"}</button></td><td style={S.td}><button style={{ ...S.btn("ghost"), padding: "2px 8px", fontSize: 11 }} onClick={() => del(a.id)}>✕</button></td></tr>; })}</tbody></table>}
    </div>
  </div>;
}

// ── FINANZAS ─────────────────────────────────────────────────
function Finanzas({ data, reload }) {
  const today = hoy();
  const [form, setForm] = useState({ tipo: "ingreso", concepto: "", monto: "", fecha: today, notas: "" });
  const [pedidoForm, setPedidoForm] = useState({ cliente_id: "", huevos: "", precio: "", fecha_entrega: "", notas: "" });
  const [compPendForm, setCompPendForm] = useState({ concepto: "", monto: "", fecha_estimada: "", notas: "", categoria: "gasto" });
  const [loading, setLoading] = useState(false);

  const tI = data.finanzas.filter(c => c.tipo === "ingreso").reduce((s, c) => s + Number(c.monto), 0);
  const tG = data.finanzas.filter(c => c.tipo === "gasto").reduce((s, c) => s + Number(c.monto), 0);
  const invTotal = data.finanzas.filter(c => c.tipo === "inversion").reduce((s, c) => s + Number(c.monto), 0);

  const agregarMovimiento = async () => {
    if (!form.monto) return;
    setLoading(true);
    try { await db.insert("finanzas", { ...form, monto: Number(form.monto) }); await reload("finanzas"); setForm(f => ({ ...f, concepto: "", monto: "", notas: "" })); } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const delMovimiento = async (id) => {
    try { await db.delete("finanzas", id); await reload("finanzas"); } catch (e) { alert("Error: " + e.message); }
  };

  const agregarPedido = async () => {
    if (!pedidoForm.precio) return;
    setLoading(true);
    try { await db.insert("pedidos", { ...pedidoForm, huevos: Number(pedidoForm.huevos), precio: Number(pedidoForm.precio), entregado: false, origen: "app" }); await reload("pedidos"); setPedidoForm({ cliente_id: "", huevos: "", precio: "", fecha_entrega: "", notas: "" }); } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const entregarPedido = async (pedido) => {
    setLoading(true);
    try {
      const cliente = data.clientes.find(c => c.id === pedido.cliente_id);
      await db.update("pedidos", pedido.id, { entregado: true, fecha_entregado: today });
      await db.insert("finanzas", { tipo: "ingreso", concepto: `Pedido: ${cliente?.nombre || "cliente"} (${pedido.huevos} huevos)`, monto: Number(pedido.precio), fecha: today, pedido_id: pedido.id });
      await reload("pedidos"); await reload("finanzas");
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const delPedido = async (id) => {
    try { await db.delete("pedidos", id); await reload("pedidos"); } catch (e) { alert("Error: " + e.message); }
  };

  const agregarCompPend = async () => {
    if (!compPendForm.concepto || !compPendForm.monto) return;
    setLoading(true);
    try { await db.insert("compras_pendientes", { ...compPendForm, monto: Number(compPendForm.monto), comprado: false }); await reload("compras_pendientes"); setCompPendForm({ concepto: "", monto: "", fecha_estimada: "", notas: "", categoria: "gasto" }); } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const marcarComprado = async (c) => {
    setLoading(true);
    try {
      await db.update("compras_pendientes", c.id, { comprado: true, fecha_comprado: today });
      if (c.categoria === "inversion") {
        await db.insert("finanzas", { tipo: "inversion", concepto: c.concepto, monto: Number(c.monto), fecha: today, notas: c.notas || "" });
      } else {
        await db.insert("finanzas", { tipo: "gasto", concepto: c.concepto, monto: Number(c.monto), fecha: today, notas: c.notas || "" });
      }
      await reload("compras_pendientes"); await reload("finanzas");
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const delCompPend = async (id) => {
    try { await db.delete("compras_pendientes", id); await reload("compras_pendientes"); } catch (e) { alert("Error: " + e.message); }
  };

  const pedidosPendientes = data.pedidos.filter(p => !p.entregado);
  const pedidosEntregados = data.pedidos.filter(p => p.entregado);
  const compsPendientes = data.compras_pendientes.filter(c => !c.comprado);
  const compsGasto = compsPendientes.filter(c => c.categoria !== "inversion");
  const compsInversion = compsPendientes.filter(c => c.categoria === "inversion");

  return <div>
    <div style={S.g3}>
      <div style={S.sb}><div style={{ ...S.sv, color: "#27ae60" }}>${tI.toLocaleString()}</div><div style={S.sl}>Ingresos acumulados</div></div>
      <div style={S.sb}><div style={{ ...S.sv, color: "#e74c3c" }}>${tG.toLocaleString()}</div><div style={S.sl}>Gastos acumulados</div></div>
      <div style={S.sb}><div style={{ ...S.sv, color: tI - tG >= 0 ? "#27ae60" : "#e74c3c" }}>${(tI - tG).toLocaleString()}</div><div style={S.sl}>Utilidad acumulada</div></div>
    </div>

    {/* PEDIDOS */}
    <div style={{ ...S.card, marginTop: 16 }}>
      <div style={S.ct}>📦 Pedidos pendientes</div>
      <div style={S.g2}>
        <Field label="Cliente">
          <select style={S.inp} value={pedidoForm.cliente_id} onChange={e => setPedidoForm(f => ({ ...f, cliente_id: e.target.value }))}>
            <option value="">Seleccionar cliente...</option>
            {data.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Precio ($MXN)"><input type="number" style={S.inp} value={pedidoForm.precio} onChange={e => setPedidoForm(f => ({ ...f, precio: e.target.value }))} /></Field>
        <Field label="Huevos (piezas)"><input type="number" style={S.inp} value={pedidoForm.huevos} onChange={e => setPedidoForm(f => ({ ...f, huevos: e.target.value }))} /></Field>
        <Field label="Fecha entrega"><input type="date" style={S.inp} value={pedidoForm.fecha_entrega} onChange={e => setPedidoForm(f => ({ ...f, fecha_entrega: e.target.value }))} /></Field>
      </div>
      <button style={S.btn()} onClick={agregarPedido} disabled={loading}>Agregar pedido</button>

      {pedidosPendientes.length > 0 && <table style={{ ...S.tbl, marginTop: 14 }}><thead><tr><th style={S.th}>Cliente</th><th style={S.th}>Huevos</th><th style={S.th}>Precio</th><th style={S.th}>Entrega</th><th style={S.th}>Acción</th></tr></thead>
        <tbody>{pedidosPendientes.map(p => { const cli = data.clientes.find(c => c.id === p.cliente_id); return <tr key={p.id}><td style={S.td}>{cli?.nombre || "—"}</td><td style={S.td}>{p.huevos || "—"}</td><td style={{ ...S.td, color: "#27ae60" }}>${Number(p.precio).toLocaleString()}</td><td style={S.td}>{p.fecha_entrega || "—"}</td><td style={S.td}><button style={{ ...S.btn("success"), padding: "4px 10px", fontSize: 11, marginRight: 4 }} onClick={() => entregarPedido(p)}>✓ Entregar</button><button style={{ ...S.btn("ghost"), padding: "4px 8px", fontSize: 11 }} onClick={() => delPedido(p.id)}>✕</button></td></tr>; })}</tbody></table>}

      {pedidosEntregados.length > 0 && <details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", fontSize: 12, color: "#a07840" }}>Ver entregados ({pedidosEntregados.length})</summary>
        <table style={{ ...S.tbl, marginTop: 8 }}><thead><tr><th style={S.th}>Cliente</th><th style={S.th}>Precio</th><th style={S.th}>Entregado</th></tr></thead>
          <tbody>{pedidosEntregados.map(p => { const cli = data.clientes.find(c => c.id === p.cliente_id); return <tr key={p.id}><td style={{ ...S.td, opacity: 0.6 }}>{cli?.nombre || "—"}</td><td style={{ ...S.td, color: "#6dbe6d", opacity: 0.6 }}>${Number(p.precio).toLocaleString()}</td><td style={{ ...S.td, opacity: 0.6 }}>{p.fecha_entregado}</td></tr>; })}</tbody></table>
      </details>}
    </div>

    {/* COMPRAS PENDIENTES */}
    <div style={S.card}>
      <div style={S.ct}>🛒 Compras pendientes</div>
      <div style={S.g2}>
        <Field label="Concepto"><input style={S.inp} value={compPendForm.concepto} onChange={e => setCompPendForm(f => ({ ...f, concepto: e.target.value }))} /></Field>
        <Field label="Monto"><input type="number" style={S.inp} value={compPendForm.monto} onChange={e => setCompPendForm(f => ({ ...f, monto: e.target.value }))} /></Field>
        <Field label="Categoría"><select style={S.inp} value={compPendForm.categoria} onChange={e => setCompPendForm(f => ({ ...f, categoria: e.target.value }))}><option value="gasto">Gasto operativo</option><option value="inversion">Inversión</option></select></Field>
        <Field label="Fecha estimada"><input type="date" style={S.inp} value={compPendForm.fecha_estimada} onChange={e => setCompPendForm(f => ({ ...f, fecha_estimada: e.target.value }))} /></Field>
      </div>
      <button style={S.btn()} onClick={agregarCompPend} disabled={loading}>Agregar</button>

      {compsGasto.length > 0 && <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: "bold", color: "#e74c3c", textTransform: "uppercase", marginBottom: 8 }}>Gastos operativos — ${compsGasto.reduce((s, c) => s + Number(c.monto || 0), 0).toLocaleString()}</div>
        <table style={S.tbl}><thead><tr><th style={S.th}>Concepto</th><th style={S.th}>Monto</th><th style={S.th}>Fecha est.</th><th style={S.th}>Acción</th></tr></thead>
          <tbody>{compsGasto.map(c => <tr key={c.id}><td style={S.td}>{c.concepto}{c.notas && <div style={{ fontSize: 10, color: "#aaa" }}>{c.notas}</div>}</td><td style={{ ...S.td, color: "#e74c3c" }}>${Number(c.monto).toLocaleString()}</td><td style={S.td}>{c.fecha_estimada || "—"}</td><td style={S.td}><button style={{ ...S.btn("success"), padding: "4px 10px", fontSize: 11, marginRight: 4 }} onClick={() => marcarComprado(c)}>✓ Comprado</button><button style={{ ...S.btn("ghost"), padding: "4px 8px", fontSize: 11 }} onClick={() => delCompPend(c.id)}>✕</button></td></tr>)}</tbody></table>
      </div>}

      {compsInversion.length > 0 && <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: "bold", color: "#f39c12", textTransform: "uppercase", marginBottom: 8 }}>Inversiones planeadas — ${compsInversion.reduce((s, c) => s + Number(c.monto || 0), 0).toLocaleString()}</div>
        <table style={S.tbl}><thead><tr><th style={S.th}>Concepto</th><th style={S.th}>Monto</th><th style={S.th}>Fecha est.</th><th style={S.th}>Acción</th></tr></thead>
          <tbody>{compsInversion.map(c => <tr key={c.id}><td style={S.td}>{c.concepto}{c.notas && <div style={{ fontSize: 10, color: "#aaa" }}>{c.notas}</div>}</td><td style={{ ...S.td, color: "#f39c12" }}>${Number(c.monto).toLocaleString()}</td><td style={S.td}>{c.fecha_estimada || "—"}</td><td style={S.td}><button style={{ ...S.btn("success"), padding: "4px 10px", fontSize: 11, marginRight: 4 }} onClick={() => marcarComprado(c)}>✓ Comprado</button><button style={{ ...S.btn("ghost"), padding: "4px 8px", fontSize: 11 }} onClick={() => delCompPend(c.id)}>✕</button></td></tr>)}</tbody></table>
      </div>}
    </div>

    {/* MOVIMIENTO MANUAL */}
    <div style={S.card}>
      <div style={S.ct}><Icon name="plus" /> Registrar movimiento manual</div>
      <div style={S.g2}>
        <Field label="Tipo"><select style={S.inp} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}><option value="ingreso">Ingreso</option><option value="gasto">Gasto</option></select></Field>
        <Field label="Fecha"><input type="date" style={S.inp} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></Field>
        <Field label="Concepto"><input style={S.inp} value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} /></Field>
        <Field label="Monto ($MXN)"><input type="number" style={S.inp} value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} /></Field>
      </div>
      <button style={S.btn()} onClick={agregarMovimiento} disabled={loading}>Registrar</button>
    </div>

    {/* HISTORIAL */}
    <div style={S.card}>
      <div style={S.ct}>📋 Historial</div>
      <table style={S.tbl}><thead><tr><th style={S.th}>Fecha</th><th style={S.th}>Tipo</th><th style={S.th}>Concepto</th><th style={S.th}>Monto</th><th style={S.th}></th></tr></thead>
        <tbody>{data.finanzas.filter(c => c.tipo !== "inversion").slice(0, 50).map(c => <tr key={c.id}><td style={S.td}>{c.fecha}</td><td style={S.td}><span style={S.bdg(c.tipo === "ingreso" ? "green" : "red")}>{c.tipo}</span></td><td style={S.td}>{c.concepto}</td><td style={{ ...S.td, color: c.tipo === "ingreso" ? "#6dbe6d" : "#be6d6d" }}>${Number(c.monto).toLocaleString()}</td><td style={S.td}><button style={{ ...S.btn("ghost"), padding: "2px 8px", fontSize: 11 }} onClick={() => delMovimiento(c.id)}>✕</button></td></tr>)}</tbody></table>
    </div>

    {invTotal > 0 && <div style={S.card}>
      <div style={S.ct}>💰 ROI</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontSize: 12, color: "#888" }}>Utilidad ${(tI - tG).toLocaleString()} / Inversión ${invTotal.toLocaleString()}</div></div>
        <div style={{ fontSize: 32, fontWeight: "bold", color: (tI - tG) / invTotal * 100 >= 0 ? "#27ae60" : "#e74c3c" }}>{((tI - tG) / invTotal * 100).toFixed(1)}%</div>
      </div>
    </div>}
  </div>;
}

// ── CLIENTES ─────────────────────────────────────────────────
function Clientes({ data, reload }) {
  const [form, setForm] = useState({ nombre: "", telefono: "", tipo: "A", cantidad_habitual: "", precio_habitual: "", notas: "" });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const agregar = async () => {
    if (!form.nombre) return;
    setLoading(true);
    try { await db.insert("clientes", { ...form, cantidad_habitual: Number(form.cantidad_habitual) || null, precio_habitual: Number(form.precio_habitual) || null, activo: true }); await reload("clientes"); setForm({ nombre: "", telefono: "", tipo: "A", cantidad_habitual: "", precio_habitual: "", notas: "" }); } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const del = async (id) => {
    try { await db.delete("clientes", id); await reload("clientes"); if (selected === id) setSelected(null); } catch (e) { alert("Error: " + e.message); }
  };

  return <div>
    <div style={S.card}>
      <div style={S.ct}>👥 Directorio ({data.clientes.length} clientes)</div>
      {data.clientes.length === 0 ? <div style={{ color: "#aaa", fontSize: 13 }}>Sin clientes.</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.clientes.map(c => {
            const pedidosCli = data.pedidos.filter(p => p.cliente_id === c.id);
            const entregados = pedidosCli.filter(p => p.entregado);
            const pendientes = pedidosCli.filter(p => !p.entregado);
            const totalComprado = entregados.reduce((s, p) => s + Number(p.precio || 0), 0);
            const isOpen = selected === c.id;
            return <div key={c.id} style={{ border: "1px solid #e8edf2", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: isOpen ? "#fff8f5" : "#fff", cursor: "pointer" }} onClick={() => setSelected(isOpen ? null : c.id)}>
                <div>
                  <div style={{ fontWeight: "bold", color: "#333", fontSize: 14 }}>👤 {c.nombre} <span style={{ ...S.bdg(c.tipo === "B" ? "green" : "gold"), fontSize: 9 }}>Tipo {c.tipo}</span></div>
                  {c.telefono && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>📞 {c.telefono}</div>}
                  {c.precio_habitual && <div style={{ fontSize: 12, color: "#ff6b35", marginTop: 2 }}>💰 ${c.precio_habitual}/huevo · {c.cantidad_habitual ? c.cantidad_habitual + " pzas típico" : ""}</div>}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#27ae60", fontWeight: "bold" }}>${totalComprado.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{entregados.length} entregados · {pendientes.length} pendiente(s)</div>
                  </div>
                  <button style={{ ...S.btn("ghost"), padding: "2px 8px", fontSize: 11 }} onClick={e => { e.stopPropagation(); del(c.id); }}>✕</button>
                </div>
              </div>
              {isOpen && <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
                {pedidosCli.length === 0 ? <div style={{ fontSize: 12, color: "#aaa" }}>Sin pedidos.</div> :
                  <table style={S.tbl}><thead><tr><th style={S.th}>Fecha</th><th style={S.th}>Huevos</th><th style={S.th}>Precio</th><th style={S.th}>Estado</th></tr></thead>
                    <tbody>{[...pedidosCli].reverse().map(p => <tr key={p.id}><td style={S.td}>{p.fecha_entrega || "—"}</td><td style={S.td}>{p.huevos || "—"}</td><td style={{ ...S.td, color: "#27ae60" }}>${Number(p.precio).toLocaleString()}</td><td style={S.td}><span style={S.bdg(p.entregado ? "green" : "gold")}>{p.entregado ? "Entregado" : "Pendiente"}</span></td></tr>)}</tbody></table>}
              </div>}
            </div>;
          })}
        </div>}
    </div>
    <div style={S.card}>
      <div style={S.ct}><Icon name="plus" /> Nuevo cliente</div>
      <div style={S.g2}>
        <Field label="Nombre"><input style={S.inp} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></Field>
        <Field label="Teléfono"><input style={S.inp} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></Field>
        <Field label="Tipo"><select style={S.inp} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}><option value="A">A — Recurrente informal</option><option value="B">B — Suscripción fija</option></select></Field>
        <Field label="Precio habitual/huevo"><input type="number" style={S.inp} value={form.precio_habitual} onChange={e => setForm(f => ({ ...f, precio_habitual: e.target.value }))} placeholder="5.00" /></Field>
        <Field label="Cantidad habitual (pzas)"><input type="number" style={S.inp} value={form.cantidad_habitual} onChange={e => setForm(f => ({ ...f, cantidad_habitual: e.target.value }))} /></Field>
      </div>
      <Field label="Notas"><input style={S.inp} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></Field>
      <button style={S.btn()} onClick={agregar} disabled={loading}>Agregar cliente</button>
    </div>
  </div>;
}

// ── MAIN ─────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [gallinas, huevos, alimento, clientes, pedidos, finanzas, compras_pendientes, configRows] = await Promise.all([
        db.get("gallinas"),
        db.get("huevos", "order=fecha.desc"),
        db.get("alimento"),
        db.get("clientes"),
        db.get("pedidos", "order=created_at.desc"),
        db.get("finanzas", "order=fecha.desc"),
        db.get("compras_pendientes"),
        db.get("config"),
      ]);

      const config = {};
      configRows.forEach(r => {
        if (r.clave === "pct_balanceado") config.pctBalanceado = Number(r.valor);
        else if (r.clave === "pct_granos") config.pctGranos = Number(r.valor);
        else if (r.clave === "dias_alerta") config.diasAlerta = Number(r.valor);
      });

      const gallinero = {};
      configRows.forEach(r => {
        if (r.clave === "gallinero_largo") gallinero.largo = Number(r.valor);
        else if (r.clave === "gallinero_ancho") gallinero.ancho = Number(r.valor);
        else if (r.clave === "gallinero_alto") gallinero.alto = Number(r.valor);
        else if (r.clave === "capacidad_max") gallinero.capacidad_max = Number(r.valor);
      });

      setData({ gallinas, huevos, alimento, clientes, pedidos, finanzas, compras_pendientes, config, gallinero });
    } catch (e) {
      alert("Error conectando con Supabase: " + e.message);
    }
  }, []);

  const reload = useCallback(async (table) => {
    setSaving(true);
    try {
      let rows;
      if (table === "huevos") rows = await db.get("huevos", "order=fecha.desc");
      else if (table === "config") {
        const configRows = await db.get("config");
        const config = {};
        configRows.forEach(r => {
          if (r.clave === "pct_balanceado") config.pctBalanceado = Number(r.valor);
          else if (r.clave === "pct_granos") config.pctGranos = Number(r.valor);
          else if (r.clave === "dias_alerta") config.diasAlerta = Number(r.valor);
        });
        setData(d => ({ ...d, config }));
        setSaving(false);
        return;
      }
      else if (table === "pedidos") rows = await db.get("pedidos", "order=created_at.desc");
      else if (table === "finanzas") rows = await db.get("finanzas", "order=fecha.desc");
      else rows = await db.get(table);
      setData(d => ({ ...d, [table]: rows }));
    } catch (e) { alert("Error recargando: " + e.message); }
    setSaving(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!data) return <div style={S.app}><div style={S.header}><p style={S.hTitle}>🐔 Huevos del Rincón</p></div><Spinner /></div>;

  const sections = { dashboard: Dashboard, gallinas: Gallinas, huevos: Huevos, alimento: Alimento, finanzas: Finanzas, clientes: Clientes };
  const Section = sections[tab];

  return <div style={S.app}>
    <div style={S.header}>
      <p style={S.hTitle}>🐔 Rincón de los Pinos</p>
      {saving && <span style={{ marginLeft: "auto", fontSize: 12, color: "#fff", fontWeight: "bold" }}>✓ Guardado</span>}
    </div>
    <nav style={S.nav}>
      {tabs.map(t => <button key={t.id} style={S.nb(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
    </nav>
    <div style={S.main}>
      <Section data={data} reload={reload} />
    </div>
  </div>;
}
