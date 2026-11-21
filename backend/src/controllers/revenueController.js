const supabase = require("../config/supabase");
const { getAreaScope, floorInScope } = require("../utils/areaScope");

const PAGE_SIZE = 1000;
const MAX_ROWS = 20000;
const TRANSACTION_LIMIT = 100;
const DAY_MS = 86400000;

const readDays = (value) => {
  const days = Number(value || 30);
  return [7, 30, 90].includes(days) ? days : null;
};

const readTzOffset = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 330;

const readDateInput = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    return null;
  }
  return timestamp;
};

const dateKey = (iso, tzOffset) =>
  new Date(new Date(iso).getTime() + tzOffset * 60000)
    .toISOString()
    .slice(0, 10);

/**
 * GET /api/revenue?days=7|30|90&tz_offset=330
 * or /api/revenue?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&tz_offset=330
 *
 * Paid revenue only. Allowed for super_admin and manager (see routes).
 * A manager only sees payments for sessions parked inside the area
 * assigned to them; a super admin sees everything.
 */
const getRevenue = async (req, res) => {
  try {
    const hasFromDate = req.query.from_date !== undefined;
    const hasToDate = req.query.to_date !== undefined;
    const hasDateRange = hasFromDate || hasToDate;
    let days;
    let startLocal;
    let endLocalExclusive;

    if (hasDateRange) {
      const fromLocal = readDateInput(req.query.from_date);
      const toLocal = readDateInput(req.query.to_date);
      if (!fromLocal || !toLocal || fromLocal > toLocal) {
        return res.status(400).json({
          success: false,
          message: "Revenue date range must include valid From and To dates, with From on or before To."
        });
      }
      startLocal = fromLocal;
      endLocalExclusive = toLocal + DAY_MS;
      days = Math.floor((endLocalExclusive - startLocal) / DAY_MS);
    } else {
      days = readDays(req.query.days);
      if (!days) {
        return res.status(400).json({
          success: false,
          message: "Revenue period must be 7, 30, or 90 days."
        });
      }

      const nowLocal = Date.now() + readTzOffset(req.query.tz_offset) * 60000;
      const todayLocalStart = Math.floor(nowLocal / DAY_MS) * DAY_MS;
      startLocal = todayLocalStart - (days - 1) * DAY_MS;
      endLocalExclusive = todayLocalStart + DAY_MS;
    }

    if (!days) {
      return res.status(400).json({
        success: false,
        message: "Revenue date range is invalid."
      });
    }

    const tzOffset = readTzOffset(req.query.tz_offset);
    const startUtc = new Date(startLocal - tzOffset * 60000);
    const endUtcExclusive = new Date(endLocalExclusive - tzOffset * 60000);

    const rows = [];

    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          total_amount,
          payment_method,
          paid_at,
          invoice_number,
          session:parking_sessions (
            ticket_code,
            parking_slot,
            vehicle:vehicles ( license_plate ),
            valet:employees ( name )
          )
        `)
        .eq("payment_status", "paid")
        .gte("paid_at", startUtc.toISOString())
        .lt("paid_at", endUtcExclusive.toISOString())
        .order("paid_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      rows.push(...(data || []));

      if (!data || data.length < PAGE_SIZE) break;
    }

    let payments = rows.map((row) => ({
      ...row,
      session: Array.isArray(row.session) ? row.session[0] : row.session
    }));

    // Managers only see revenue from the hotel branch assigned to them.
    if (req.user?.role === "manager" || req.user?.role === "parking_admin") {
      const scope = await getAreaScope(req.user);

      const { data: slotRows, error: slotError } = await supabase
        .from("parking_slots")
        .select("slot_number, floor_id");

      if (slotError) throw slotError;

      const slotFloor = new Map(
        (slotRows || []).map((row) => [row.slot_number, row.floor_id])
      );

      payments = payments.filter((payment) => {
        const slot = payment.session?.parking_slot;
        if (slot && slotFloor.has(slot)) {
          return floorInScope(scope, slotFloor.get(slot));
        }
        return false;
      });
    }

    // Map slots to hotels
    const { data: allSlotRows } = await supabase
      .from("parking_slots")
      .select(`
        slot_number,
        floor:parking_floors (
          id,
          building:parking_buildings ( id, building_name )
        )
      `);

    const slotHotelMap = new Map();
    (allSlotRows || []).forEach((row) => {
      if (row.slot_number) {
        slotHotelMap.set(row.slot_number, {
          hotel_id: row.floor?.building?.id || null,
          hotel_name: row.floor?.building?.building_name || "Unassigned"
        });
      }
    });

    const hotelId = req.query.hotelId || req.query.building_id;
    if (hotelId && hotelId !== "all") {
      payments = payments.filter((payment) => {
        const slot = payment.session?.parking_slot;
        const hInfo = slot ? slotHotelMap.get(slot) : null;
        return hInfo && hInfo.hotel_id === hotelId;
      });
    }

    const todayKey = dateKey(new Date().toISOString(), tzOffset);

    const dailyMap = new Map();
    for (let index = 0; index < days; index += 1) {
      const key = new Date(startLocal + index * DAY_MS)
        .toISOString()
        .slice(0, 10);
      dailyMap.set(key, 0);
    }

    const methodMap = new Map();
    let periodTotal = 0;
    let todayTotal = 0;

    payments.forEach((payment) => {
      const amount = Number(payment.total_amount || 0);
      const key = dateKey(payment.paid_at, tzOffset);

      periodTotal += amount;
      if (key === todayKey) todayTotal += amount;
      if (dailyMap.has(key)) dailyMap.set(key, dailyMap.get(key) + amount);

      const method = payment.payment_method || "other";
      const entry = methodMap.get(method) || { method, amount: 0, count: 0 };
      entry.amount += amount;
      entry.count += 1;
      methodMap.set(method, entry);
    });

    return res.status(200).json({
      success: true,
      days,
      summary: {
        today: todayTotal,
        period: periodTotal,
        count: payments.length,
        average: payments.length ? periodTotal / payments.length : 0,
        by_method: [...methodMap.values()].sort((a, b) => b.amount - a.amount)
      },
      daily: [...dailyMap.entries()].map(([date, value]) => ({ date, value })),
      transactions: payments.slice(0, TRANSACTION_LIMIT).map((payment) => {
        const slot = payment.session?.parking_slot;
        const hInfo = slot ? slotHotelMap.get(slot) : null;
        return {
          id: payment.id,
          invoice_number: payment.invoice_number || "",
          ticket_code: payment.session?.ticket_code || "",
          vehicle_number: payment.session?.vehicle?.license_plate || "",
          valet_name: payment.session?.valet?.name || "",
          parking_slot: payment.session?.parking_slot || "",
          payment_method: payment.payment_method || "",
          amount: Number(payment.total_amount || 0),
          paid_at: payment.paid_at,
          hotel_id: hInfo?.hotel_id || null,
          hotel_name: hInfo?.hotel_name || "Unassigned"
        };
      })
    });
  } catch (error) {
    console.error("Revenue summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch revenue."
    });
  }
};

module.exports = { getRevenue };
