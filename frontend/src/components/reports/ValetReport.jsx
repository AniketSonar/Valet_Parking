import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import {
  getReportValets,
  getValetReport,
  exportValetReport,
} from "../../api/reportApi";

import "./css/ValetReport.css";

const STATUS_OPTIONS = [
  { value: "checked_in", label: "Checked In" },
  { value: "parked", label: "Parked" },
  { value: "retrieval_requested", label: "Retrieval Requested" },
  { value: "retrieving", label: "Retrieving" },
  { value: "ready_for_pickup", label: "Ready For Pickup" },
  { value: "returned_completed", label: "Returned" },
];

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

const PAGE_SIZE = 25;

const toInputDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const presetRange = (preset) => {
  const today = new Date();
  const start = new Date(today);

  switch (preset) {
    case "today":
      return { from: toInputDate(today), to: toInputDate(today) };
    case "yesterday":
      start.setDate(today.getDate() - 1);
      return { from: toInputDate(start), to: toInputDate(start) };
    case "last7":
      start.setDate(today.getDate() - 6);
      return { from: toInputDate(start), to: toInputDate(today) };
    case "last30":
      start.setDate(today.getDate() - 29);
      return { from: toInputDate(start), to: toInputDate(today) };
    case "month":
      return {
        from: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: toInputDate(today),
      };
    case "all":
      return { from: "", to: "" };
    default:
      return null;
  }
};

const formatMoney = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDuration = (minutes) => {
  if (minutes == null) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/* Dropdown with checkboxes. `value` = [] means "everything". */
const MultiSelect = ({
  label,
  allLabel,
  options,
  value,
  onChange,
  searchable = false,
  summaryLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const visible = term.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(term.trim().toLowerCase()))
    : options;

  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const text =
    value.length === 0
      ? allLabel
      : value.length === 1
      ? options.find((o) => o.value === value[0])?.label || `1 ${summaryLabel}`
      : `${value.length} ${summaryLabel} selected`;

  return (
    <div className="vr-field" ref={ref}>
      <label>{label}</label>
      <button type="button" className="vr-select-btn" onClick={() => setOpen((o) => !o)}>
        <span>{text}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="vr-menu">
          {searchable && (
            <input
              type="text"
              placeholder={`Search ${summaryLabel}...`}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          )}
          <label className="vr-check">
            <input type="checkbox" checked={value.length === 0} onChange={() => onChange([])} />
            {allLabel}
          </label>
          <div className="vr-menu-list">
            {visible.map((option) => (
              <label key={option.value} className="vr-check">
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  onChange={() => toggle(option.value)}
                />
                {option.label}
              </label>
            ))}
            {visible.length === 0 && <p className="vr-menu-empty">Nothing found.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const ValetReport = () => {
  const initialRange = presetRange("last7");

  const [valets, setValets] = useState([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [selectedValets, setSelectedValets] = useState([]); // [] = all valets

  const [preset, setPreset] = useState("last7");
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [dateField, setDateField] = useState("checked_in_at");
  const [statuses, setStatuses] = useState([]);
  const [parkingType, setParkingType] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [search, setSearch] = useState("");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  // Load the valet list for the filter.
  useEffect(() => {
    let active = true;

    getReportValets()
      .then((response) => {
        if (active && response?.success) setValets(response.valets || []);
      })
      .catch((err) => active && setError(err.message));

    return () => {
      active = false;
    };
  }, []);

  const buildFilters = useCallback(
    () => ({
      valet_ids: selectedValets,
      date_from: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : "",
      date_to: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : "",
      date_field: dateField,
      status: statuses,
      parking_type: parkingType,
      payment_status: paymentStatus,
      search: search.trim(),
      tz_offset: -new Date().getTimezoneOffset(),
    }),
    [selectedValets, dateFrom, dateTo, dateField, statuses, parkingType, paymentStatus, search]
  );

  const generate = useCallback(async () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("The 'From' date must not be after the 'To' date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getValetReport(buildFilters());

      if (!response?.success) {
        throw new Error(response?.message || "Failed to generate the report.");
      }

      setReport(response);
      setPage(1);
    } catch (err) {
      setError(err.message || "Failed to generate the report.");
    } finally {
      setLoading(false);
    }
  }, [buildFilters, dateFrom, dateTo]);

  // First load.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async (format) => {
    try {
      setDownloading(format);
      setError("");

      const blob = await exportValetReport(buildFilters(), format);
      triggerDownload(blob, `valet-report-${toInputDate(new Date())}.${format}`);
    } catch (err) {
      setError(err.message || "Failed to download the report.");
    } finally {
      setDownloading("");
    }
  };

  const applyPreset = (id) => {
    setPreset(id);
    const range = presetRange(id);
    if (range) {
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  };

  const resetFilters = () => {
    const range = presetRange("last7");
    setSelectedValets([]);
    setPreset("last7");
    setDateFrom(range.from);
    setDateTo(range.to);
    setDateField("checked_in_at");
    setStatuses([]);
    setParkingType("");
    setPaymentStatus("");
    setSearch("");
    setMoreOpen(false);
  };

  const valetOptions = useMemo(
    () =>
      valets.map((v) => ({
        value: v.id,
        label: v.is_active === false ? `${v.name} (inactive)` : v.name,
      })),
    [valets]
  );

  const moreCount =
    (dateField !== "checked_in_at" ? 1 : 0) +
    (parkingType ? 1 : 0) +
    (paymentStatus ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const rows = report?.rows || [];
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = report?.summary;

  return (
    <section className="valet-report">
      <header className="vr-header">
        <div>
          <h2>Valet Report</h2>
          <p>Filter by valet, date and status, then view or download the report.</p>
        </div>

        <div className="vr-actions">
          <button
            type="button"
            className="vr-btn vr-btn-ghost"
            onClick={() => download("csv")}
            disabled={!!downloading || loading}
          >
            <FileSpreadsheet size={16} />
            {downloading === "csv" ? "Preparing..." : "Download CSV"}
          </button>
          <button
            type="button"
            className="vr-btn vr-btn-ghost"
            onClick={() => download("pdf")}
            disabled={!!downloading || loading}
          >
            <FileText size={16} />
            {downloading === "pdf" ? "Preparing..." : "Download PDF"}
          </button>
        </div>
      </header>

      {/* ---------------------------- FILTERS ---------------------------- */}
      <div className="vr-filters">
        <MultiSelect
          label="Valet"
          allLabel="All valets"
          summaryLabel="valets"
          options={valetOptions}
          value={selectedValets}
          onChange={setSelectedValets}
          searchable
        />

        <div className="vr-field">
          <label>Period</label>
          <select value={preset} onChange={(e) => applyPreset(e.target.value)}>
            {PRESETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <MultiSelect
          label="Status"
          allLabel="All statuses"
          summaryLabel="statuses"
          options={STATUS_OPTIONS}
          value={statuses}
          onChange={setStatuses}
        />
      </div>

      {preset === "custom" && (
        <div className="vr-filters vr-filters-dates">
          <div className="vr-field">
            <label>From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="vr-field">
            <label>To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className="vr-more-toggle"
        onClick={() => setMoreOpen((open) => !open)}
        aria-expanded={moreOpen}
      >
        <SlidersHorizontal size={15} />
        More filters
        {moreCount > 0 && <span className="vr-badge">{moreCount}</span>}
        <ChevronDown size={15} className={moreOpen ? "vr-flip" : ""} />
      </button>

      {moreOpen && (
        <div className="vr-filters vr-filters-more">
          <div className="vr-field">
            <label>Date based on</label>
            <select value={dateField} onChange={(e) => setDateField(e.target.value)}>
              <option value="checked_in_at">Check-in date</option>
              <option value="completed_at">Return date</option>
            </select>
          </div>

          <div className="vr-field">
            <label>Parking type</label>
            <select value={parkingType} onChange={(e) => setParkingType(e.target.value)}>
              <option value="">All</option>
              <option value="valet">Valet</option>
              <option value="self">Self</option>
            </select>
          </div>

          <div className="vr-field">
            <label>Payment</label>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="none">No payment</option>
            </select>
          </div>

          <div className="vr-field">
            <label>Search</label>
            <div className="vr-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Ticket, vehicle, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
              />
            </div>
          </div>
        </div>
      )}

      <div className="vr-generate-row">
        <button
          type="button"
          className="vr-btn vr-btn-primary"
          onClick={generate}
          disabled={loading}
        >
          {loading ? <RefreshCw size={16} className="vr-spin" /> : <Filter size={16} />}
          {loading ? "Generating..." : "Generate report"}
        </button>
        <button type="button" className="vr-btn vr-btn-ghost" onClick={resetFilters}>
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      {error && <div className="vr-error">{error}</div>}

      {/* ---------------------------- RESULTS ---------------------------- */}
      {summary && (
        <>
          <div className="vr-cards">
            <div className="vr-card">
              <span>Total sessions</span>
              <strong>{summary.total_sessions}</strong>
            </div>
            <div className="vr-card">
              <span>Completed</span>
              <strong>{summary.completed_sessions}</strong>
            </div>
            <div className="vr-card">
              <span>Active</span>
              <strong>{summary.active_sessions}</strong>
            </div>
            <div className="vr-card">
              <span>Paid revenue</span>
              <strong>{formatMoney(summary.total_revenue)}</strong>
            </div>
            <div className="vr-card">
              <span>Pending amount</span>
              <strong>{formatMoney(summary.pending_amount)}</strong>
            </div>
            <div className="vr-card">
              <span>Avg. duration</span>
              <strong>{formatDuration(summary.avg_duration_minutes)}</strong>
            </div>
          </div>

          <h3 className="vr-subtitle">Per valet</h3>
          <div className="vr-table-wrap">
            <table className="vr-table">
              <thead>
                <tr>
                  <th>Valet</th>
                  <th>Sessions</th>
                  <th>Completed</th>
                  <th>Active</th>
                  <th>Revenue</th>
                  <th>Avg. duration</th>
                </tr>
              </thead>
              <tbody>
                {report.by_valet.map((entry) => (
                  <tr key={entry.valet_id || "unassigned"}>
                    <td>{entry.valet_name}</td>
                    <td>{entry.sessions}</td>
                    <td>{entry.completed}</td>
                    <td>{entry.active}</td>
                    <td>{formatMoney(entry.revenue)}</td>
                    <td>{formatDuration(entry.avg_duration_minutes)}</td>
                  </tr>
                ))}
                {report.by_valet.length === 0 && (
                  <tr>
                    <td colSpan={6} className="vr-empty">
                      No sessions match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 className="vr-subtitle">
            Sessions <small>({rows.length})</small>
          </h3>
          <div className="vr-table-wrap">
            <table className="vr-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Valet</th>
                  <th>Vehicle</th>
                  <th>Customer</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Checked in</th>
                  <th>Returned</th>
                  <th>Duration</th>
                  <th>Payment</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.ticket_code}</td>
                    <td>{row.valet_name}</td>
                    <td>{row.vehicle_number || "-"}</td>
                    <td>{row.customer_name || "-"}</td>
                    <td>{row.parking_slot || "-"}</td>
                    <td>
                      <span className={`vr-status vr-status-${row.status}`}>
                        {row.status_label}
                      </span>
                    </td>
                    <td>{row.checked_in_display || "-"}</td>
                    <td>{row.completed_display || "-"}</td>
                    <td>{row.duration_display || "-"}</td>
                    <td>
                      <span className={`vr-pay vr-pay-${row.payment_status}`}>
                        {row.payment_status}
                      </span>
                    </td>
                    <td>{formatMoney(row.amount)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="vr-empty">
                      No sessions match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {rows.length > PAGE_SIZE && (
            <div className="vr-pager">
              <button
                type="button"
                className="vr-btn vr-btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                className="vr-btn vr-btn-ghost"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}

          <p className="vr-footnote">
            <Download size={13} /> CSV and PDF downloads include every matching session,
            not only the page shown above.
          </p>
        </>
      )}
    </section>
  );
};

export default ValetReport;
