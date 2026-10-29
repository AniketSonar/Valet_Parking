const PDFDocument = require("pdfkit");

const supabase = require("../config/supabase");
const { getAreaScope, floorInScope, applyFloorScope } = require("../utils/areaScope");

const PAGE_SIZE = 1000;
const MAX_ROWS = 20000;

const STATUS_LABELS = {
  checked_in: "Checked In",
  parked: "Parked",
  retrieval_requested: "Retrieval Requested",
  retrieving: "Retrieving",
  ready_for_pickup: "Ready For Pickup",
  returned_completed: "Returned"
};

const ACTIVE_STATUSES = [
  "checked_in",
  "parked",
  "retrieval_requested",
  "retrieving",
  "ready_for_pickup"
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const splitList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Reads and validates the report filters from the query string.
 *   valet_ids   comma separated employee ids, or "all" / empty for every valet
 *   date_from   ISO date-time (start of the first day)
 *   date_to     ISO date-time (end of the last day)
 *   date_field  checked_in_at (default) | completed_at
 *   status      comma separated session statuses
 *   parking_type, payment_status, search
 *   tz_offset   minutes east of UTC of the viewer (used for per-day grouping)
 */
const readFilters = (query) => {
  const valetIds = splitList(query.valet_ids).filter(
    (id) => id.toLowerCase() !== "all"
  );

  const dateField =
    query.date_field === "completed_at" ? "completed_at" : "checked_in_at";

  const tzOffset = Number.isFinite(Number(query.tz_offset))
    ? Number(query.tz_offset)
    : 330;

  return {
    valetIds,
    dateField,
    dateFrom: parseDate(query.date_from),
    dateTo: parseDate(query.date_to),
    statuses: splitList(query.status),
    parkingType: query.parking_type || "",
    paymentStatus: query.payment_status || "",
    search: String(query.search || "").trim().toLowerCase(),
    tzOffset
  };
};

const toLocalDateKey = (iso, tzOffset) => {
  if (!iso) return null;
  const shifted = new Date(new Date(iso).getTime() + tzOffset * 60000);
  return shifted.toISOString().slice(0, 10);
};

const formatDateTime = (iso, tzOffset) => {
  if (!iso) return "";
  const shifted = new Date(new Date(iso).getTime() + tzOffset * 60000);
  const text = shifted.toISOString();
  return `${text.slice(0, 10)} ${text.slice(11, 16)}`;
};

const formatDuration = (minutes) => {
  if (minutes == null) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const money = (value) => Number(value || 0);

const firstOf = (value) => (Array.isArray(value) ? value[0] : value) || null;

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

const SESSION_SELECT = `
  id,
  ticket_code,
  parking_type,
  status,
  parking_slot,
  valet_id,
  checked_in_at,
  parked_at,
  completed_at,
  vehicle:vehicles (
    license_plate,
    make,
    model,
    customer:customers ( name, phone )
  ),
  valet:employees ( id, name, phone ),
  payment:payments (
    payment_status,
    payment_method,
    total_amount,
    invoice_number,
    paid_at
  )
`;

const loadSessions = async (filters, user) => {
  const rows = [];

  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    let query = supabase
      .from("parking_sessions")
      .select(SESSION_SELECT)
      .order(filters.dateField, { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (filters.valetIds.length > 0) {
      query = query.in("valet_id", filters.valetIds);
    }

    if (filters.dateFrom) {
      query = query.gte(filters.dateField, filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      query = query.lte(filters.dateField, filters.dateTo.toISOString());
    }

    if (filters.statuses.length > 0) {
      query = query.in("status", filters.statuses);
    }

    if (filters.parkingType) {
      query = query.eq("parking_type", filters.parkingType);
    }

    const { data, error } = await query;
    if (error) throw error;

    rows.push(...(data || []));

    if (!data || data.length < PAGE_SIZE) break;
  }

  let result = rows;

  // Managers only see sessions parked inside the area assigned to them.
  if (user?.role === "manager") {
    const scope = await getAreaScope(user);

    const { data: slotRows, error } = await supabase
      .from("parking_slots")
      .select("slot_number, floor_id");

    if (error) throw error;

    const slotFloor = new Map(
      (slotRows || []).map((row) => [row.slot_number, row.floor_id])
    );

    result = result.filter(
      (session) =>
        !session.parking_slot ||
        !slotFloor.has(session.parking_slot) ||
        floorInScope(scope, slotFloor.get(session.parking_slot))
    );
  }

  return result;
};

const buildRow = (session, tzOffset) => {
  const payment = firstOf(session.payment);

  let durationMinutes = null;
  if (session.checked_in_at && session.completed_at) {
    durationMinutes = Math.max(
      0,
      Math.round(
        (new Date(session.completed_at) - new Date(session.checked_in_at)) /
          60000
      )
    );
  }

  return {
    id: session.id,
    ticket_code: session.ticket_code,
    valet_id: session.valet_id || null,
    valet_name: session.valet?.name || "Unassigned",
    vehicle_number: session.vehicle?.license_plate || "",
    vehicle: [session.vehicle?.make, session.vehicle?.model]
      .filter(Boolean)
      .join(" "),
    customer_name: session.vehicle?.customer?.name || "",
    customer_phone: session.vehicle?.customer?.phone || "",
    parking_type: session.parking_type || "",
    parking_slot: session.parking_slot || "",
    status: session.status,
    status_label: STATUS_LABELS[session.status] || session.status,
    checked_in_at: session.checked_in_at,
    completed_at: session.completed_at,
    checked_in_display: formatDateTime(session.checked_in_at, tzOffset),
    completed_display: formatDateTime(session.completed_at, tzOffset),
    duration_minutes: durationMinutes,
    duration_display: formatDuration(durationMinutes),
    payment_status: payment?.payment_status || "none",
    payment_method: payment?.payment_method || "",
    invoice_number: payment?.invoice_number || "",
    amount: money(payment?.total_amount)
  };
};

const applyRowFilters = (rows, filters) => {
  let result = rows;

  if (filters.paymentStatus) {
    result = result.filter((row) => row.payment_status === filters.paymentStatus);
  }

  if (filters.search) {
    result = result.filter((row) =>
      [
        row.ticket_code,
        row.vehicle_number,
        row.customer_name,
        row.customer_phone,
        row.valet_name,
        row.parking_slot
      ].some((value) =>
        String(value || "").toLowerCase().includes(filters.search)
      )
    );
  }

  return result;
};

const summarise = (rows, filters) => {
  const paidRows = rows.filter((row) => row.payment_status === "paid");
  const completed = rows.filter((row) => row.status === "returned_completed");
  const durations = rows
    .map((row) => row.duration_minutes)
    .filter((value) => value != null);

  const summary = {
    total_sessions: rows.length,
    completed_sessions: completed.length,
    active_sessions: rows.filter((row) => ACTIVE_STATUSES.includes(row.status))
      .length,
    unassigned_sessions: rows.filter((row) => !row.valet_id).length,
    total_revenue: paidRows.reduce((sum, row) => sum + row.amount, 0),
    pending_amount: rows
      .filter((row) => row.payment_status === "pending")
      .reduce((sum, row) => sum + row.amount, 0),
    paid_count: paidRows.length,
    avg_duration_minutes: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null
  };

  const byValetMap = new Map();
  const byDateMap = new Map();

  rows.forEach((row) => {
    const key = row.valet_id || "unassigned";

    if (!byValetMap.has(key)) {
      byValetMap.set(key, {
        valet_id: row.valet_id,
        valet_name: row.valet_name,
        sessions: 0,
        completed: 0,
        active: 0,
        revenue: 0,
        durations: []
      });
    }

    const entry = byValetMap.get(key);
    entry.sessions += 1;
    if (row.status === "returned_completed") entry.completed += 1;
    if (ACTIVE_STATUSES.includes(row.status)) entry.active += 1;
    if (row.payment_status === "paid") entry.revenue += row.amount;
    if (row.duration_minutes != null) entry.durations.push(row.duration_minutes);

    const dateKey = toLocalDateKey(row[filters.dateField], filters.tzOffset);
    if (dateKey) {
      if (!byDateMap.has(dateKey)) {
        byDateMap.set(dateKey, { date: dateKey, sessions: 0, revenue: 0 });
      }
      const day = byDateMap.get(dateKey);
      day.sessions += 1;
      if (row.payment_status === "paid") day.revenue += row.amount;
    }
  });

  const byValet = [...byValetMap.values()]
    .map(({ durations, ...entry }) => ({
      ...entry,
      avg_duration_minutes: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const byDate = [...byDateMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return { summary, byValet, byDate };
};

const buildReport = async (req) => {
  const filters = readFilters(req.query);
  const sessions = await loadSessions(filters, req.user);

  const rows = applyRowFilters(
    sessions.map((session) => buildRow(session, filters.tzOffset)),
    filters
  );

  const { summary, byValet, byDate } = summarise(rows, filters);

  return { filters, rows, summary, byValet, byDate };
};

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

/** Valets the logged-in user may report on (filter dropdown). */
const getReportValets = async (req, res) => {
  try {
    const { data: valets, error } = await supabase
      .from("employees")
      .select("id, name, phone, is_active")
      .eq("role", "valet")
      .order("name", { ascending: true });

    if (error) throw error;

    let result = valets || [];

    if (req.user?.role === "manager") {
      const scope = await getAreaScope(req.user);

      const { data: posted, error: postedError } = await applyFloorScope(
        supabase
          .from("valet_assignments")
          .select("valet_id")
          .eq("is_active", true),
        scope
      );

      if (postedError) throw postedError;

      const allowed = new Set((posted || []).map((row) => row.valet_id));
      result = result.filter((valet) => allowed.has(valet.id));
    }

    return res.status(200).json({ success: true, valets: result });
  } catch (error) {
    console.error("Get report valets error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load valets."
    });
  }
};

const getValetReport = async (req, res) => {
  try {
    const { rows, summary, byValet, byDate } = await buildReport(req);

    return res.status(200).json({
      success: true,
      summary,
      by_valet: byValet,
      by_date: byDate,
      count: rows.length,
      rows
    });
  } catch (error) {
    console.error("Valet report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate the report."
    });
  }
};

/* ------------------------------ CSV ------------------------------- */

const csvCell = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const sendCsv = (res, { rows, summary, byValet }, fileBase) => {
  const lines = [];

  lines.push(["Valet Parking Report"].map(csvCell).join(","));
  lines.push(
    [
      "Total sessions",
      summary.total_sessions,
      "Completed",
      summary.completed_sessions,
      "Revenue (paid)",
      summary.total_revenue.toFixed(2)
    ]
      .map(csvCell)
      .join(",")
  );
  lines.push("");

  lines.push(
    ["Valet", "Sessions", "Completed", "Active", "Revenue", "Avg duration"]
      .map(csvCell)
      .join(",")
  );
  byValet.forEach((entry) => {
    lines.push(
      [
        entry.valet_name,
        entry.sessions,
        entry.completed,
        entry.active,
        entry.revenue.toFixed(2),
        formatDuration(entry.avg_duration_minutes)
      ]
        .map(csvCell)
        .join(",")
    );
  });
  lines.push("");

  lines.push(
    [
      "Ticket",
      "Valet",
      "Vehicle number",
      "Vehicle",
      "Customer",
      "Phone",
      "Parking type",
      "Slot",
      "Status",
      "Checked in",
      "Returned",
      "Duration",
      "Payment status",
      "Payment method",
      "Invoice",
      "Amount"
    ]
      .map(csvCell)
      .join(",")
  );

  rows.forEach((row) => {
    lines.push(
      [
        row.ticket_code,
        row.valet_name,
        row.vehicle_number,
        row.vehicle,
        row.customer_name,
        row.customer_phone,
        row.parking_type,
        row.parking_slot,
        row.status_label,
        row.checked_in_display,
        row.completed_display,
        row.duration_display,
        row.payment_status,
        row.payment_method,
        row.invoice_number,
        row.amount.toFixed(2)
      ]
        .map(csvCell)
        .join(",")
    );
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.csv"`);
  // BOM so Excel opens UTF-8 correctly.
  res.status(200).send(`\uFEFF${lines.join("\r\n")}`);
};

/* ------------------------------ PDF ------------------------------- */

const sendPdf = (res, report, fileBase) => {
  const { rows, summary, byValet, filters } = report;

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.pdf"`);
  doc.pipe(res);

  const left = doc.page.margins.left;
  const usable = doc.page.width - left - doc.page.margins.right;
  const bottom = doc.page.height - doc.page.margins.bottom;

  const drawTable = (columns, tableRows) => {
    const totalWeight = columns.reduce((sum, col) => sum + col.w, 0);
    const widths = columns.map((col) => (col.w / totalWeight) * usable);

    const drawRow = (cells, { header = false } = {}) => {
      const y = doc.y;
      const height = 16;

      if (y + height > bottom) {
        doc.addPage();
        drawRow(columns.map((col) => col.label), { header: true });
        return;
      }

      if (header) {
        doc.rect(left, y - 2, usable, height).fill("#8b1230");
        doc.fillColor("#ffffff").font("Helvetica-Bold");
      } else {
        doc.fillColor("#1f2937").font("Helvetica");
      }

      let x = left;
      cells.forEach((cell, index) => {
        doc.fontSize(7.5).text(String(cell ?? ""), x + 3, y + 1, {
          width: widths[index] - 6,
          height: height - 2,
          ellipsis: true,
          lineBreak: false
        });
        x += widths[index];
      });

      doc.y = y + height;
    };

    drawRow(columns.map((col) => col.label), { header: true });
    tableRows.forEach((cells) => drawRow(cells));
    doc.moveDown(0.5);
    doc.fillColor("#1f2937");
  };

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#8b1230");
  doc.text("Valet Parking Report");
  doc.moveDown(0.2);

  const rangeText = [
    filters.dateFrom ? formatDateTime(filters.dateFrom, filters.tzOffset).slice(0, 10) : "Start",
    filters.dateTo ? formatDateTime(filters.dateTo, filters.tzOffset).slice(0, 10) : "Today"
  ].join(" to ");

  const valetText =
    filters.valetIds.length === 0
      ? "All valets"
      : byValet.map((entry) => entry.valet_name).join(", ") ||
        `${filters.valetIds.length} valet(s)`;

  doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
  doc.text(
    `Period: ${rangeText} (${
      filters.dateField === "completed_at" ? "return date" : "check-in date"
    })   |   Valets: ${valetText}`
  );
  doc.text(`Generated: ${formatDateTime(new Date().toISOString(), filters.tzOffset)}`);
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#1f2937");
  doc.text(
    `Sessions: ${summary.total_sessions}    Completed: ${summary.completed_sessions}    Active: ${summary.active_sessions}    Paid revenue: Rs. ${summary.total_revenue.toFixed(
      2
    )}    Pending: Rs. ${summary.pending_amount.toFixed(2)}    Avg duration: ${
      formatDuration(summary.avg_duration_minutes) || "-"
    }`
  );
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").fontSize(11).text("Per valet");
  doc.moveDown(0.3);
  drawTable(
    [
      { label: "Valet", w: 4 },
      { label: "Sessions", w: 1.5 },
      { label: "Completed", w: 1.5 },
      { label: "Active", w: 1.5 },
      { label: "Revenue (Rs.)", w: 2 },
      { label: "Avg duration", w: 2 }
    ],
    byValet.map((entry) => [
      entry.valet_name,
      entry.sessions,
      entry.completed,
      entry.active,
      entry.revenue.toFixed(2),
      formatDuration(entry.avg_duration_minutes) || "-"
    ])
  );

  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(11).text("Sessions");
  doc.moveDown(0.3);
  drawTable(
    [
      { label: "Ticket", w: 2 },
      { label: "Valet", w: 2.2 },
      { label: "Vehicle", w: 2 },
      { label: "Customer", w: 2.4 },
      { label: "Slot", w: 1 },
      { label: "Status", w: 2 },
      { label: "Checked in", w: 2.4 },
      { label: "Returned", w: 2.4 },
      { label: "Payment", w: 1.4 },
      { label: "Amount", w: 1.3 }
    ],
    rows.map((row) => [
      row.ticket_code,
      row.valet_name,
      row.vehicle_number,
      row.customer_name,
      row.parking_slot,
      row.status_label,
      row.checked_in_display,
      row.completed_display,
      row.payment_status,
      row.amount.toFixed(2)
    ])
  );

  doc.end();
};

const exportValetReport = async (req, res) => {
  try {
    const report = await buildReport(req);
    const format = req.query.format === "pdf" ? "pdf" : "csv";

    const stamp = new Date().toISOString().slice(0, 10);
    const fileBase = `valet-report-${stamp}`;

    if (format === "pdf") {
      return sendPdf(res, report, fileBase);
    }

    return sendCsv(res, report, fileBase);
  } catch (error) {
    console.error("Valet report export error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export the report."
    });
  }
};

module.exports = {
  getReportValets,
  getValetReport,
  exportValetReport
};
