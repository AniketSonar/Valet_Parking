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
    )}    Avg duration: ${
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

const getSystemReports = async (req, res) => {
  try {
    let hotelId = req.query.hotelId || req.query.building_id;
    const period = req.query.period || "daily"; // daily, weekly, monthly
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setUTCHours(0, 0, 0, 0);
    if (period === "weekly") {
      periodStart.setUTCDate(periodStart.getUTCDate() - 6);
    } else if (period === "monthly") {
      periodStart.setUTCDate(1);
    }

    // If caller is a manager, lock strictly to their assigned branch
    const isManager = req.user?.role === "manager" || req.user?.role === "parking_admin";
    let managerScope = null;
    if (isManager) {
      managerScope = await getAreaScope(req.user);
      hotelId = managerScope.buildingId || "none";
    }

    // 1. Fetch buildings, floors, slots
    const [bRes, fRes, sRes, sessRes, mgrRes, valRes, empRes, mgrUsersRes] = await Promise.all([
      supabase.from("parking_buildings").select("*").order("building_name"),
      supabase.from("parking_floors").select("*, building:parking_buildings(*)"),
      supabase.from("parking_slots").select("id, slot_number, floor_id, status"),
      supabase.from("parking_sessions").select(`
        id, ticket_code, parking_slot, status, checked_in_at, completed_at,
        vehicle:vehicles ( id, license_plate, make, model, color ),
        valet:employees ( id, name, phone, role ),
        payment:payments ( total_amount, payment_status )
      `).order("checked_in_at", { ascending: false }),
      supabase.from("manager_assignments").select(`
        manager_id, floor_id,
        manager:users!manager_assignments_manager_id_fkey ( id, name, email ),
        floor:parking_floors ( id, floor_name, building:parking_buildings ( id, building_name ) )
      `).eq("is_active", true),
      supabase.from("valet_assignments").select(`
        valet_id, floor_id,
        valet:employees ( id, name, phone, email ),
        floor:parking_floors ( id, floor_name, building:parking_buildings ( id, building_name ) )
      `).eq("is_active", true),
      supabase.from("employees").select("*").eq("role", "valet"),
      supabase.from("users").select("id, name, email, role, is_active").in("role", ["manager", "parking_admin"])
    ]);

    const rawBuildings = bRes.data || [];
    const buildings = (isManager && managerScope)
      ? rawBuildings.filter((b) => managerScope.buildingIds.includes(b.id))
      : rawBuildings;
    const floors = fRes.data || [];
    const slots = sRes.data || [];
    const allSessions = sessRes.data || [];
    const managerAssignments = mgrRes.data || [];
    const valetAssignments = valRes.data || [];
    const allValetEmployees = empRes.data || [];

    // Slot to hotel mapping
    const slotInfoMap = new Map();
    slots.forEach((s) => {
      const fl = floors.find((f) => f.id === s.floor_id);
      slotInfoMap.set(s.slot_number, {
        floor_id: s.floor_id,
        floor_name: fl?.floor_name || "Unassigned",
        hotel_id: fl?.building?.id || null,
        hotel_name: fl?.building?.building_name || "Unassigned"
      });
    });

    // Filter sessions if hotelId specified
    let targetSessions = allSessions;
    if (hotelId && hotelId !== "all") {
      targetSessions = allSessions.filter((s) => {
        const info = s.parking_slot ? slotInfoMap.get(s.parking_slot) : null;
        return info && info.hotel_id === hotelId;
      });
    }
    const periodSessions = targetSessions.filter((session) => (
      session.checked_in_at &&
      new Date(session.checked_in_at) >= periodStart &&
      new Date(session.checked_in_at) <= now
    ));

    const periodSessionIds = periodSessions.map((session) => session.id);
    const feedbackBySession = new Map();
    if (periodSessionIds.length > 0) {
      const { data: feedbackRows, error: feedbackError } = await supabase
        .from("feedback")
        .select("parking_session_id, rating")
        .in("parking_session_id", periodSessionIds);
      if (feedbackError) throw feedbackError;
      (feedbackRows || []).forEach((row) => {
        const ratings = feedbackBySession.get(row.parking_session_id) || [];
        ratings.push(Number(row.rating || 0));
        feedbackBySession.set(row.parking_session_id, ratings);
      });
    }

    const staffByHotel = new Map();
    const addHotelStaff = (buildingId, staffId) => {
      if (!buildingId || !staffId) return;
      const staffIds = staffByHotel.get(buildingId) || new Set();
      staffIds.add(staffId);
      staffByHotel.set(buildingId, staffIds);
    };
    managerAssignments.forEach((assignment) => {
      addHotelStaff(assignment.floor?.building?.id, assignment.manager_id);
    });
    valetAssignments.forEach((assignment) => {
      const floor = floors.find((item) => item.id === assignment.floor_id);
      addHotelStaff(floor?.building_id, assignment.valet_id);
    });

    // 2. Hotel-wise Parking Reports (for table / cards)
    const hotelReports = buildings.map((b) => {
      const bFloors = floors.filter((f) => f.building_id === b.id);
      const bFloorIds = new Set(bFloors.map((f) => f.id));
      const bSlots = slots.filter((s) => bFloorIds.has(s.floor_id));
      const bSlotNumbers = new Set(bSlots.map((s) => s.slot_number));

      const bSessions = allSessions.filter((s) => s.parking_slot && bSlotNumbers.has(s.parking_slot));
      const bCheckouts = bSessions.filter((s) => s.status === "returned_completed");
      const bActive = bSessions.filter((s) => ["checked_in", "parked", "retrieval_requested", "retrieving"].includes(s.status));
      const occupiedSlots = bSlots.filter((s) => s.status === "occupied").length;
      const totalSlots = bSlots.length;
      const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

      const revenue = bSessions.reduce((sum, s) => {
        const p = Array.isArray(s.payment) ? s.payment[0] : s.payment;
        if (p?.payment_status === "paid") {
          return sum + Number(p.total_amount || 0);
        }
        return sum;
      }, 0);

      return {
        hotel_id: b.id,
        hotel_name: b.building_name,
        address: b.address || "",
        total_slots: totalSlots,
        totalSlots,
        occupied_slots: occupiedSlots,
        occupiedSlots,
        available_slots: Math.max(0, totalSlots - occupiedSlots),
        occupancy_rate: occupancyRate,
        occupancyRate,
        total_parked: bSessions.length,
        sessionsCount: bSessions.length,
        total_checkouts: bCheckouts.length,
        completedSessions: bCheckouts.length,
        active_sessions: bActive.length,
        total_revenue: revenue,
        revenue,
        staffCount: staffByHotel.get(b.id)?.size || 0
      };
    });

    // 3. Manager-wise performance
    const allManagerUsers = mgrUsersRes?.data || [];

    const managerPerformance = allManagerUsers.map((mu) => {
      const muAssignments = managerAssignments.filter((ma) => ma.manager_id === mu.id);
      const assignedFloorIds = new Set(muAssignments.map((ma) => ma.floor_id));
      const flSlots = slots.filter((s) => assignedFloorIds.has(s.floor_id));
      const slotNumbers = new Set(flSlots.map((s) => s.slot_number));
      const mSessions = periodSessions.filter((s) => s.parking_slot && slotNumbers.has(s.parking_slot));
      const managerRevenue = mSessions.reduce((sum, session) => {
        const payment = Array.isArray(session.payment) ? session.payment[0] : session.payment;
        return payment?.payment_status === "paid"
          ? sum + Number(payment.total_amount || 0)
          : sum;
      }, 0);

      const firstFloor = muAssignments[0]?.floor;
      const muHotelId = firstFloor?.building?.id || null;
      const hotelName = firstFloor?.building?.building_name || "Unassigned";
      const floorNames = muAssignments.map((ma) => ma.floor?.floor_name).filter(Boolean);
      const floorDisplay = floorNames.length > 0 ? floorNames.join(", ") : "All Floors";

      return {
        manager_id: mu.id,
        manager_name: mu.name || "Manager",
        name: mu.name || "Manager",
        email: mu.email || "",
        hotel_id: muHotelId,
        hotel_name: hotelName,
        is_active: mu.is_active !== false,
        floor_name: floorDisplay,
        slots_managed: flSlots.length,
        staff_count: staffByHotel.get(muHotelId)?.size || 0,
        total_sessions: mSessions.length,
        active_sessions: mSessions.filter((s) => ["checked_in", "parked", "retrieval_requested", "retrieving"].includes(s.status)).length,
        total_revenue: managerRevenue
      };
    });

    // 4. Valet-wise performance
    const valetPerformance = allValetEmployees.map((v) => {
      const va = valetAssignments.find((a) => a.valet_id === v.id);
      const fl = va ? floors.find((f) => f.id === va.floor_id) : null;

      const vSessions = periodSessions.filter((s) => s.valet?.id === v.id);
      const vCheckins = vSessions.filter((s) => s.checked_in_at).length;
      const vRetrievals = vSessions.filter((s) => s.status === "returned_completed").length;
      const vActive = vSessions.filter((s) => ["checked_in", "parked", "retrieval_requested", "retrieving"].includes(s.status)).length;
      const vRevenue = vSessions.reduce((sum, s) => {
        const p = Array.isArray(s.payment) ? s.payment[0] : s.payment;
        return p?.payment_status === "paid" ? sum + Number(p.total_amount || 0) : sum;
      }, 0);
      const valetRatings = vSessions.flatMap((session) => feedbackBySession.get(session.id) || []);
      const averageRating = valetRatings.length
        ? Math.round((valetRatings.reduce((sum, rating) => sum + rating, 0) / valetRatings.length) * 10) / 10
        : null;

      return {
        valet_id: v.id,
        valet_name: v.name,
        name: v.name,
        phone: v.phone || "",
        is_active: v.is_active,
        hotel_id: fl?.building?.id || null,
        hotel_name: fl?.building?.building_name || "Unassigned",
        floor_name: fl?.floor_name || "Unassigned",
        total_sessions: vSessions.length,
        sessionsHandled: vSessions.length,
        check_ins: vCheckins,
        retrievals_completed: vRetrievals,
        returnsCompleted: vRetrievals,
        active_tasks: vActive,
        average_retrieval_minutes: null,
        average_rating: averageRating,
        rating_count: valetRatings.length,
        revenueCollected: vRevenue
      };
    });

    // 5. Vehicle category categorization
    const categorizeVehicle = (make = "", model = "") => {
      const text = `${make || ""} ${model || ""}`.toLowerCase().trim();
      const HATCHBACK_KEYWORDS = ["i10", "i20", "swift", "baleno", "wagon", "tiago", "alto", "polo", "micra", "kwid", "glanza", "altroz", "ignis"];
      const SUV_KEYWORDS = ["suv", "fortuner", "thar", "scorpio", "creta", "seltos", "brezza", "safari", "harrier", "nexon", "xuv", "innova", "ertiga", "compass", "defender", "duster", "punch", "venue", "sonet", "hector", "taigun", "kushaq"];
      const LUXURY_KEYWORDS = ["bmw", "mercedes", "audi", "jaguar", "land rover", "range rover", "porsche", "lexus", "volvo", "bentley", "rolls"];
      const SPORTS_KEYWORDS = ["ferrari", "lamborghini", "sports", "mustang", "gt", "maserati", "mclaren", "bugatti", "supra"];
      const SEDAN_KEYWORDS = ["sedan", "city", "verna", "civic", "accord", "camry", "corolla", "octavia", "superb", "slavia", "virtus", "dzire", "amaze", "ciaz", "etios"];

      if (HATCHBACK_KEYWORDS.some((kw) => text.includes(kw))) return "Hatchback";
      if (SPORTS_KEYWORDS.some((kw) => text.includes(kw))) return "Sports";
      if (LUXURY_KEYWORDS.some((kw) => text.includes(kw))) return "Luxury";
      if (SUV_KEYWORDS.some((kw) => text.includes(kw))) return "SUV";
      if (SEDAN_KEYWORDS.some((kw) => text.includes(kw))) return "Sedan";
      return "Others";
    };

    const catCounts = { SUV: 0, Sedan: 0, Hatchback: 0, Luxury: 0, Sports: 0, Others: 0 };
    const vehicleFrequencyMap = new Map();

    targetSessions.forEach((s) => {
      const veh = s.vehicle;
      if (veh) {
        const cat = categorizeVehicle(veh.make, veh.model);
        catCounts[cat] = (catCounts[cat] || 0) + 1;

        if (veh.license_plate) {
          const entry = vehicleFrequencyMap.get(veh.license_plate) || {
            license_plate: veh.license_plate,
            make: veh.make || "",
            model: veh.model || "",
            category: cat,
            visits: 0
          };
          entry.visits += 1;
          vehicleFrequencyMap.set(veh.license_plate, entry);
        }
      }
    });

    const totalCategorized = targetSessions.length || 1;
    const vehicleCategories = Object.entries(catCounts).map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / totalCategorized) * 100)
    }));

    const topFrequentVehicles = [...vehicleFrequencyMap.values()]
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    // 6. Time-series parking reports (daily, weekly, monthly)
    const timeSeries = [];
    const daysBack = period === "monthly" ? 90 : period === "weekly" ? 28 : 7;
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en-IN", {
        weekday: daysBack <= 7 ? "short" : undefined,
        day: "numeric",
        month: "short"
      });

      const daySessions = targetSessions.filter((s) => {
        if (!s.checked_in_at) return false;
        return s.checked_in_at.slice(0, 10) === dateKey;
      });

      const dayRevenue = daySessions.reduce((sum, s) => {
        const p = Array.isArray(s.payment) ? s.payment[0] : s.payment;
        if (p?.payment_status === "paid") {
          return sum + Number(p.total_amount || 0);
        }
        return sum;
      }, 0);

      timeSeries.push({
        date: dateKey,
        label: dayLabel,
        sessions: daySessions.length,
        checkouts: daySessions.filter((s) => s.status === "returned_completed").length,
        revenue: dayRevenue
      });
    }

    return res.status(200).json({
      success: true,
      hotelId: hotelId || "all",
      period,
      summary: {
        totalVehiclesParked: targetSessions.length,
        activeSessions: targetSessions.filter((s) => ["checked_in", "parked", "retrieval_requested", "retrieving"].includes(s.status)).length,
        totalCheckouts: targetSessions.filter((s) => s.status === "returned_completed").length,
        totalRevenue: targetSessions.reduce((sum, s) => {
          const p = Array.isArray(s.payment) ? s.payment[0] : s.payment;
          return p?.payment_status === "paid" ? sum + Number(p.total_amount || 0) : sum;
        }, 0)
      },
      hotelReports,
      managerPerformance: (isManager && managerScope)
        ? managerPerformance.filter((m) => managerScope.buildingIds.includes(m.hotel_id) || m.manager_id === req.user.id)
        : (hotelId && hotelId !== "all")
          ? managerPerformance.filter((m) => m.hotel_id === hotelId)
          : managerPerformance,
      valetPerformance: (isManager && managerScope)
        ? valetPerformance.filter((v) => managerScope.buildingIds.includes(v.hotel_id))
        : (hotelId && hotelId !== "all")
          ? valetPerformance.filter((v) => v.hotel_id === hotelId)
          : valetPerformance,
      vehicleCategories,
      topFrequentVehicles,
      timeSeries
    });
  } catch (error) {
    console.error("System reports error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate system reports."
    });
  }
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
  exportValetReport,
  getSystemReports
};
