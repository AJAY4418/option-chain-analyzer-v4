import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, ShieldCheck, Wifi, WifiOff, Download, TrendingUp, BarChart3, CircleAlert } from "lucide-react";

const SYMBOLS = ["NIFTY", "BANKNIFTY", "FINNIFTY"];
const money = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—";

export default function App() {
  const [symbol, setSymbol] = useState("NIFTY");
  const [expiry, setExpiry] = useState("");
  const [expiries, setExpiries] = useState([]);
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      const q = new URLSearchParams({ symbol });
      if (expiry) q.set("expiry", expiry);
      const response = await fetch("/api/option-chain?" + q.toString());
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "डेटा प्राप्त नहीं हुआ");
      setPayload(body);
      setExpiry(body.expiry || "");
      setExpiries(body.available_expiries || []);
      setUpdated(new Date().toLocaleTimeString("en-IN"));
      setStatus("live");
    } catch (e) {
      setStatus("offline");
      setError(e.message || "Backend से संपर्क नहीं हो पाया।");
      setPayload(null);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then(() => { if (active) setStatus("ready"); })
      .catch(() => { if (active) setStatus("offline"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setExpiry("");
    setPayload(null);
  }, [symbol]);

  const records = useMemo(() => {
    const rows = payload?.data?.records?.data || payload?.data?.data || [];
    return Array.isArray(rows) ? rows : [];
  }, [payload]);

  function exportCsv() {
    if (!records.length) return;
    const rows = [["Strike", "CE LTP", "CE OI", "CE Change OI", "PE LTP", "PE OI", "PE Change OI"]];
    for (const row of records) {
      rows.push([
        row.strikePrice ?? row.strike_price ?? "",
        row.CE?.lastPrice ?? "", row.CE?.openInterest ?? "", row.CE?.changeinOpenInterest ?? "",
        row.PE?.lastPrice ?? "", row.PE?.openInterest ?? "", row.PE?.changeinOpenInterest ?? ""
      ]);
    }
    const csv = rows.map((r) => r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `option-chain-${symbol.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusLabel = status === "live" ? "डेटा मिला" : status === "ready" ? "Backend connected" : status === "checking" ? "जाँच जारी" : "कनेक्शन नहीं";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Activity size={22} /></div>
          <div><div className="eyebrow">MARKET INTELLIGENCE</div><h1>Option Chain <span>Analyzer V4</span></h1></div>
        </div>
        <div className={"connection " + (status === "live" ? "connected" : status === "offline" ? "disconnected" : "")}>
          {status === "offline" ? <WifiOff size={15} /> : <Wifi size={15} />} {statusLabel}
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">INDIAN INDEX OPTIONS</div>
          <h2>Option chain, <span>एक जगह।</span></h2>
          <p>OI, PCR और market structure देखने के लिए analysis dashboard.</p>
        </div>
        <div className="mode-pill"><ShieldCheck size={16} /> ANALYSIS ONLY · NO ORDERS</div>
      </section>

      <section className="control-panel">
        <label>Index
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {SYMBOLS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>Expiry
          <select value={expiry} onChange={(e) => setExpiry(e.target.value)} disabled={!expiries.length}>
            <option value="">{expiries.length ? "पहले expiry चुनें" : "डेटा आने पर उपलब्ध"}</option>
            {expiries.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <button className="primary-button" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? "spin" : ""} /> {refreshing ? "लोड हो रहा है..." : "डेटा Refresh"}
        </button>
        <button className="secondary-button" onClick={exportCsv} disabled={!records.length}>
          <Download size={16} /> CSV Export
        </button>
      </section>

      {error && <div className="notice error"><CircleAlert size={18} /><div><strong>डेटा उपलब्ध नहीं है</strong><p>{error}</p><small>NSE की तरफ से request block होने या API बदलने पर ऐसा हो सकता है। कुछ देर बाद फिर प्रयास करें।</small></div></div>}

      <section className="stats-grid">
        <article className="stat-card"><div className="stat-heading">Market Status <Activity size={17} /></div><div className="stat-value">{status === "live" ? "Connected" : "—"}</div><div className="stat-foot">{updated ? "Last checked " + updated : "Refresh दबाकर डेटा जाँचें"}</div></article>
        <article className="stat-card"><div className="stat-heading">Selected Index <BarChart3 size={17} /></div><div className="stat-value">{symbol}</div><div className="stat-foot">Index option chain</div></article>
        <article className="stat-card"><div className="stat-heading">Expiry <TrendingUp size={17} /></div><div className="stat-value compact">{expiry || "—"}</div><div className="stat-foot">{expiries.length ? expiries.length + " expiries returned" : "डेटा के बाद दिखेगा"}</div></article>
        <article className="stat-card"><div className="stat-heading">Option Rows <Activity size={17} /></div><div className="stat-value">{records.length || "—"}</div><div className="stat-foot">Source response rows</div></article>
      </section>

      <section className="table-panel">
        <div className="panel-heading"><div><h3>Option Chain</h3><p>Call (CE) और Put (PE) की मुख्य जानकारी</p></div><span className="table-tag">{payload?.provider || "NSE"} · {payload?.live ? "API response" : "Not connected"}</span></div>
        {records.length ? (
          <div className="table-scroll"><table><thead><tr><th colSpan="3" className="ce-head">CALL / CE</th><th rowSpan="2">Strike</th><th colSpan="3" className="pe-head">PUT / PE</th></tr><tr><th>LTP</th><th>OI</th><th>Change OI</th><th>LTP</th><th>OI</th><th>Change OI</th></tr></thead>
            <tbody>{records.map((row, i) => <tr key={(row.strikePrice ?? i) + "-" + i}><td>{money(row.CE?.lastPrice)}</td><td>{money(row.CE?.openInterest)}</td><td>{money(row.CE?.changeinOpenInterest)}</td><td className="strike">{money(row.strikePrice ?? row.strike_price)}</td><td>{money(row.PE?.lastPrice)}</td><td>{money(row.PE?.openInterest)}</td><td>{money(row.PE?.changeinOpenInterest)}</td></tr>)}</tbody>
          </table></div>
        ) : <div className="empty-state"><div className="empty-icon"><BarChart3 size={26} /></div><strong>अभी option-chain डेटा लोड नहीं हुआ</strong><p>Index चुनें और “डेटा Refresh” दबाएँ। लाइव डेटा उपलब्धता NSE connection पर निर्भर है।</p></div>}
      </section>

      <section className="notice info"><CircleAlert size={18} /><div><strong>महत्वपूर्ण सूचना</strong><p>यह शुरुआती dashboard है। PCR, Max Pain, India VIX, Greeks, charts और alerts अगले विकास चरणों में जोड़े जाएँगे। इसे अभी trading signal या निवेश सलाह न मानें।</p></div></section>
      <footer>Option Chain Analyzer V4 · Built for analysis · No automatic trading</footer>
    </main>
  );
}
