import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCurrentUser } from "@/lib/auth";
import { authFetch } from "@/lib/api";
import "../styles/Dashboard.css";

const API = "/api";

const Dashboard = () => {
  const [summary, setSummary] = useState(null);

  // Keep these for tables/charts (optional but useful)
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);

  const [error, setError] = useState("");

  // ✅ report status UI
  const [reportMsg, setReportMsg] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportVisibility, setReportVisibility] = useState("Admin Only");

  const load = async () => {
    try {
      setError("");

      const [sumRes, iRes, sRes] = await Promise.all([
        authFetch(`${API}/dashboard/summary`),
        authFetch(`${API}/inventory`),
        authFetch(`${API}/sales`),
      ]);

      if (!sumRes.ok) throw new Error("Dashboard summary fetch failed");
      if (!iRes.ok) throw new Error("Inventory fetch failed");
      if (!sRes.ok) throw new Error("Sales fetch failed");

      const sumData = await sumRes.json();
      const iData = await iRes.json();
      const sData = await sRes.json();

      setSummary(sumData || null);
      setInventory(Array.isArray(iData) ? iData : []);
      setSales(Array.isArray(sData) ? sData : []);
    } catch (e) {
      setError("Failed to load dashboard data.");
    }
  };

  // ✅ Generate report (PDF download) + show report id
  const generateReport = async () => {
    try {
      setReportLoading(true);
      setReportMsg("");
      setError("");

      await new Promise(r => setTimeout(r, 600));

      const requestBody = {
        reportTitle: "Dashboard Summary Export",
        reportType: "INVENTORY",
        startDate: null,
        endDate: null,
        visibility: reportVisibility || "ADMIN"
      };

      const res = await authFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      
      if (!res.ok) {
          throw new Error("Failed to register dashboard report on backend");
      }
      const data = await res.json();
      setReportMsg(`Report generated successfully! Report ID: ${data.id}`);
      
    } catch (e) {
      setReportMsg("");
      setError(e?.message || "Report generation failed.");
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Near-expiry list from inventory endpoint (still ok)
  const nearExpiryList = useMemo(() => {
    return inventory
      .filter((x) => {
        const st = (x.status || "").toLowerCase();
        return st.includes("expiring") || st.includes("expired");
      })
      .slice()
      .sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)))
      .slice(0, 12);
  }, [inventory]);

  // Movers from sales endpoint (still ok)
  const movers = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);

    const map = new Map(); // productName -> qty
    sales.forEach((s) => {
      const d = new Date(s.saleDate);
      if (Number.isNaN(d.getTime())) return;
      if (d < cutoff) return;

      const name = s.productName || "Unknown";
      map.set(name, (map.get(name) || 0) + Number(s.quantity || 0));
    });

    const rows = Array.from(map.entries()).map(([productName, qty]) => ({
      productName,
      qty,
    }));

    rows.sort((a, b) => b.qty - a.qty);

    return {
      fast: rows.slice(0, 5),
      slow: rows.slice(-5).reverse(),
    };
  }, [sales]);

  // Monthly expiry loss (still from inventory table)
  const monthlyExpiryLoss = useMemo(() => {
    const expired = inventory.filter((x) =>
      (x.status || "").toLowerCase().includes("expired")
    );

    const byMonth = new Map(); // YYYY-MM -> qty
    expired.forEach((row) => {
      const month = String(row.expiryDate || "").slice(0, 7) || "Unknown";
      byMonth.set(month, (byMonth.get(month) || 0) + Number(row.quantity || 0));
    });

    return Array.from(byMonth.entries())
      .map(([month, qty]) => ({ month, qty }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [inventory]);

  const maxQty = useMemo(() => {
    return Math.max(1, ...monthlyExpiryLoss.map((x) => x.qty));
  }, [monthlyExpiryLoss]);

  return (
    <div className="dash-page">
      {/* ✅ VIDEO BACKGROUND */}
      <video
        className="dash-bg-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/video/background.mp4" type="video/mp4" />
      </video>

      {/* ✅ DARK/BLUR OVERLAY for readability */}
      <div className="dash-bg-overlay" />

      {/* ✅ CONTENT */}
      <div className="dash-content">
        <div className="dash-header">
          <div>
            <h1>Dashboard</h1>
            <p className="subtitle">
              Summary cards are loaded from backend. Tables/charts use inventory
              & sales.
            </p>
          </div>

          <div className="dash-actions">
            {/* ✅ NEW: report button and visibility */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={reportVisibility}
                onChange={(e) => setReportVisibility(e.target.value)}
                className="btn btn-ghost"
                style={{ appearance: 'auto', background: 'rgba(255, 255, 255, 0.1)', cursor: 'pointer', padding: '0 12px' }}
                title="Select Report Audience"
              >
                <option value="ADMIN" style={{ color: '#000' }}>Admin Only</option>
                <option value="STAFF" style={{ color: '#000' }}>Staff</option>
                <option value="ALL" style={{ color: '#000' }}>All</option>
              </select>
              <button
                className="btn"
                onClick={generateReport}
                disabled={reportLoading}
                title="Download dashboard summary report"
              >
                {reportLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>

            <button className="btn btn-ghost" onClick={load}>
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {reportMsg && <div className="banner banner-success">{reportMsg}</div>}

        {/* KPI Cards (FROM BACKEND SUMMARY) */}
        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi-label">Total Products</div>
            <div className="kpi-value">{summary?.totalProducts ?? "-"}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Total Inventory Batches</div>
            <div className="kpi-value">{summary?.totalBatches ?? "-"}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Total Stock Qty</div>
            <div className="kpi-value">{summary?.totalStockQty ?? "-"}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Low Stock Batches</div>
            <div className="kpi-value">{summary?.lowStockBatches ?? "-"}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Expiring Soon (≤ 7 days)</div>
            <div className="kpi-value">{summary?.expiringSoonBatches ?? "-"}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Expired Batches</div>
            <div className="kpi-value">{summary?.expiredBatches ?? "-"}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Sales Today (Qty)</div>
            <div className="kpi-value">{summary?.salesTodayQty ?? "-"}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Active Discounts</div>
            <div className="kpi-value">{summary?.activeDiscounts ?? "-"}</div>
          </div>
        </div>

        <div className="dash-grid">
          {/* Near Expiry List */}
          <div className="card">
            <div className="card-title">
              <h2>Near-Expiry Product List</h2>
              <span className="muted">Expired + Expiring Soon</span>
            </div>

            {nearExpiryList.length === 0 ? (
              <div className="empty">No near-expiry items 🎉</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th className="right">Qty</th>
                      <th className="right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nearExpiryList.map((x) => (
                      <tr key={x.id}>
                        <td>{x.productName}</td>
                        <td>{x.batchNumber}</td>
                        <td>{x.expiryDate}</td>
                        <td className="right">{x.quantity}</td>
                        <td className="right">
                          <span
                            className={
                              "pill " +
                              ((x.status || "").toLowerCase().includes("expired")
                                ? "pill-bad"
                                : "pill-warn")
                            }
                          >
                            {x.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="muted note">Showing first 12 items…</div>
              </div>
            )}
          </div>

          {/* Monthly Expiry Loss */}
          <div className="card">
            <div className="card-title">
              <h2>Monthly Expiry (Expired Qty)</h2>
              <span className="muted">Bar chart (simple)</span>
            </div>

            {monthlyExpiryLoss.length === 0 ? (
              <div className="empty">No expired data yet.</div>
            ) : (
              <div className="bars">
                {monthlyExpiryLoss.map((x) => {
                  const pct = Math.round((x.qty / maxQty) * 100);
                  return (
                    <div className="bar-row" key={x.month}>
                      <div className="bar-month">{x.month}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="bar-val">{x.qty} qty</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fast vs Slow Moving */}
          <div className="card">
            <div className="card-title">
              <h2>Fast vs Slow Moving (Last 30 days)</h2>
              <span className="muted">Based on sales quantity</span>
            </div>

            <div className="two-col">
              <div>
                <div className="mini-head">Fast</div>
                {movers.fast.length === 0 ? (
                  <div className="empty small">No sales data yet.</div>
                ) : (
                  <ul className="list">
                    {movers.fast.map((r, idx) => (
                      <li key={idx}>
                        <span>{r.productName}</span>
                        <b>{r.qty}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="mini-head">Slow</div>
                {movers.slow.length === 0 ? (
                  <div className="empty small">No sales data yet.</div>
                ) : (
                  <ul className="list">
                    {movers.slow.map((r, idx) => (
                      <li key={idx}>
                        <span>{r.productName}</span>
                        <b>{r.qty}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="muted note">
              (Later you’ll combine this with expiry to show “Sales vs Expiry
              comparison”.)
            </div>
          </div>

          {/* AI placeholder */}
          <div className="card">
            <div className="card-title">
              <h2>AI Expiry Risk (Coming Soon)</h2>
              <span className="muted">Placeholder</span>
            </div>
            <div className="empty">
              AI predictions will appear here once the model is connected.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;