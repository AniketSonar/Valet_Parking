import React, { useCallback, useEffect, useState } from "react";
import { Users, Building2, FileSpreadsheet, FileText, RefreshCw, Search } from "lucide-react";
import { getAllStaff } from "../../api/staffApi";

const PAGE_SIZE = 15;

export default function ManagerReport() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadManagers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllStaff({ role: "manager" });
      const list = (res?.users || res?.data || res || []).filter(
        (s) => s.role === "manager" || s.role === "parking_admin"
      );
      setManagers(list);
    } catch {
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadManagers(); }, [loadManagers]);

  const filtered = managers.filter((m) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (m.name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.hotel_name || "").toLowerCase().includes(q)
    );
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const downloadCSV = () => {
    const headers = ["Name", "Email", "Role", "Hotel Branch", "Floor", "Status"];
    const rows = filtered.map((m) => [
      m.name || "",
      m.email || "",
      m.role || "",
      m.hotel_name || "Unassigned",
      m.floor_name || "—",
      m.employee_is_active ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manager_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#42235e", display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={18} color="#42235e" />
            Manager Report
          </h2>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={loadManagers}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "#374151" }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
          <button
            type="button"
            onClick={downloadCSV}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "8px", border: "1px solid #bc9b6a", background: "#fff8f0", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "#92670a" }}
          >
            <FileSpreadsheet size={13} />
            Download CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "8px", background: "#fafafa" }}>
        <Search size={14} color="#9ca3af" />
        <input
          type="text"
          placeholder="Search by name, email or hotel..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", color: "#374151", flex: 1 }}
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: "12px" }}>✕</button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "11px 16px", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>#</th>
              <th style={{ padding: "11px 16px", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Manager</th>
              <th style={{ padding: "11px 16px", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</th>
              <th style={{ padding: "11px 16px", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hotel Branch</th>
              <th style={{ padding: "11px 16px", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned Floor</th>
              <th style={{ padding: "11px 16px", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "#9ca3af", fontSize: "13px" }}>Loading managers...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "#9ca3af", fontSize: "13px" }}>No managers found.</td></tr>
            ) : pageRows.map((m, idx) => (
              <tr key={m.id || idx} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#faf5ff"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "12px 16px", color: "#9ca3af", fontWeight: "600" }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: "700", color: "#1f2937" }}>{m.name || "—"}</div>
                  <div style={{ fontSize: "11.5px", color: "#6b7280", marginTop: "2px" }}>{m.email || ""}</div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "3px 9px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: m.role === "parking_admin" ? "#ede9fe" : "#e0f2fe", color: m.role === "parking_admin" ? "#6d28d9" : "#0369a1" }}>
                    {m.role === "parking_admin" ? "Parking Admin" : "Manager"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: "600", color: "#42235e" }}>
                    <Building2 size={13} />
                    {m.hotel_name || "Unassigned"}
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "#374151" }}>{m.floor_name || "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "3px 9px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: m.is_active !== false ? "#dcfce7" : "#fee2e2", color: m.is_active !== false ? "#15803d" : "#b91c1c" }}>
                    {m.is_active !== false ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination + summary */}
      {filtered.length > 0 && (
        <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} managers
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" onClick={() => setPage(p)}
                style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "12px", background: p === page ? "#42235e" : "#f3f4f6", color: p === page ? "#fff" : "#374151" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
