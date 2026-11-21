const supabase = require("../config/supabase");
const { getAreaScope } = require("../utils/areaScope");

/**
 * Helper to fetch hotel scope (floors, slots, sessions, staff)
 */
const getHotelScope = async (hotelId) => {
  if (!hotelId || hotelId === "all") {
    return { isFiltered: false, floorIds: [], slotNumbers: [], sessionIds: [], staffUserIds: [] };
  }

  // 1. Get floors for this hotel/building
  const { data: floors } = await supabase
    .from("parking_floors")
    .select("id")
    .eq("building_id", hotelId);
  const floorIds = (floors || []).map((f) => f.id);

  // 2. Get slots for these floors
  let slotNumbers = [];
  if (floorIds.length > 0) {
    const { data: slots } = await supabase
      .from("parking_slots")
      .select("slot_number")
      .in("floor_id", floorIds);
    slotNumbers = (slots || []).map((s) => s.slot_number).filter(Boolean);
  }

  // 3. Get session IDs associated with these slots
  let sessionIds = [];
  if (slotNumbers.length > 0) {
    const { data: sessions } = await supabase
      .from("parking_sessions")
      .select("id")
      .in("parking_slot", slotNumbers);
    sessionIds = (sessions || []).map((s) => s.id);
  }

  // 4. Get managers and valets assigned to these floors
  let staffUserIds = [];
  if (floorIds.length > 0) {
    const { data: managers } = await supabase
      .from("manager_assignments")
      .select("manager_id")
      .in("floor_id", floorIds)
      .eq("is_active", true);
    (managers || []).forEach((m) => {
      if (m.manager_id) staffUserIds.push(m.manager_id);
    });

    const { data: valets } = await supabase
      .from("valet_assignments")
      .select("valet:employees(email)")
      .in("floor_id", floorIds)
      .eq("is_active", true);
    const valetEmails = (valets || []).map((v) => v.valet?.email).filter(Boolean);
    if (valetEmails.length > 0) {
      const { data: valetUsers } = await supabase
        .from("users")
        .select("id")
        .in("email", valetEmails);
      (valetUsers || []).forEach((u) => staffUserIds.push(u.id));
    }
  }

  return {
    isFiltered: true,
    floorIds,
    slotNumbers,
    sessionIds,
    staffUserIds: [...new Set(staffUserIds)],
  };
};

const getDashboardStats = async (req, res) => {
  try {
    let hotelId = req.query.hotelId || req.query.hotel_id;
    if (req.user?.role === "manager" || req.user?.role === "parking_admin") {
      const userScope = await getAreaScope(req.user);
      if (userScope.buildingId) {
        hotelId = userScope.buildingId;
      }
    }
    const scope = await getHotelScope(hotelId);

    // 1. Staff count
    let totalStaff = 0;
    let activeStaff = 0;
    if (scope.isFiltered) {
      if (scope.staffUserIds.length > 0) {
        const { data: staffList } = await supabase
          .from("users")
          .select("id, is_active")
          .in("id", scope.staffUserIds);
        totalStaff = staffList?.length || 0;
        activeStaff = (staffList || []).filter((s) => s.is_active).length;
      }
    } else {
      const { count: tStaff } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });
      totalStaff = tStaff || 0;

      const { count: aStaff } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      activeStaff = aStaff || 0;
    }

    // 2. Active parking sessions
    let activeParkingSessions = 0;
    if (scope.isFiltered) {
      if (scope.slotNumbers.length > 0) {
        const { count: actCount } = await supabase
          .from("parking_sessions")
          .select("*", { count: "exact", head: true })
          .in("status", ["checked_in", "parked", "retrieval_requested", "retrieving"])
          .in("parking_slot", scope.slotNumbers);
        activeParkingSessions = actCount || 0;
      }
    } else {
      const { count: actCount } = await supabase
        .from("parking_sessions")
        .select("*", { count: "exact", head: true })
        .in("status", ["checked_in", "parked", "retrieval_requested", "retrieving"]);
      activeParkingSessions = actCount || 0;
    }

    // 3. Open Incidents
    let openIncidents = 0;
    if (scope.isFiltered) {
      if (scope.sessionIds.length > 0) {
        const { count: incCount } = await supabase
          .from("incidents")
          .select("*", { count: "exact", head: true })
          .neq("status", "closed")
          .in("parking_session_id", scope.sessionIds);
        openIncidents = incCount || 0;
      }
    } else {
      const { count: incCount } = await supabase
        .from("incidents")
        .select("*", { count: "exact", head: true })
        .neq("status", "closed");
      openIncidents = incCount || 0;
    }

    // 4. Revenue Today
    const now = new Date();
    const kolkataDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
    const startOfDayISO = new Date(`${kolkataDate}T00:00:00+05:30`).toISOString();

    let todayRevenue = 0;
    let payQuery = supabase
      .from("payments")
      .select("total_amount, parking_session_id")
      .eq("payment_status", "paid")
      .gte("paid_at", startOfDayISO);

    if (scope.isFiltered) {
      if (scope.sessionIds.length > 0) {
        payQuery = payQuery.in("parking_session_id", scope.sessionIds);
        const { data: todayPayments, error: paymentError } = await payQuery;
        if (!paymentError && todayPayments) {
          todayRevenue = todayPayments.reduce(
            (total, payment) => total + Number(payment.total_amount || 0),
            0
          );
        }
      }
    } else {
      const { data: todayPayments, error: paymentError } = await payQuery;
      if (!paymentError && todayPayments) {
        todayRevenue = todayPayments.reduce(
          (total, payment) => total + Number(payment.total_amount || 0),
          0
        );
      }
    }

    // 5. Total vehicles
    let totalVehicles = 0;
    if (scope.isFiltered) {
      if (scope.slotNumbers.length > 0) {
        const { data: hotelSessions } = await supabase
          .from("parking_sessions")
          .select("vehicle_id")
          .in("parking_slot", scope.slotNumbers);
        const uniqueVehicles = new Set((hotelSessions || []).map((s) => s.vehicle_id).filter(Boolean));
        totalVehicles = uniqueVehicles.size;
      }
    } else {
      const { count: vehCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true });
      totalVehicles = vehCount || 0;
    }

    // 6. Today checkouts
    let todayCheckouts = 0;
    let checkoutQuery = supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "returned_completed")
      .gte("completed_at", startOfDayISO);

    if (scope.isFiltered) {
      if (scope.slotNumbers.length > 0) {
        checkoutQuery = checkoutQuery.in("parking_slot", scope.slotNumbers);
        const { count: chkCount } = await checkoutQuery;
        todayCheckouts = chkCount || 0;
      }
    } else {
      const { count: chkCount } = await checkoutQuery;
      todayCheckouts = chkCount || 0;
    }

    // 7. Customers
    let totalCustomers = 0;
    if (scope.isFiltered) {
      totalCustomers = totalVehicles; // Approximates customer vehicles for hotel
    } else {
      const { count: custCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });
      totalCustomers = custCount || 0;
    }

    // 8. Available Slots
    let availableSlots = 0;
    if (scope.isFiltered) {
      if (scope.slotNumbers.length > 0) {
        const { count: avail } = await supabase
          .from("parking_slots")
          .select("*", { count: "exact", head: true })
          .in("slot_number", scope.slotNumbers)
          .eq("status", "available");
        availableSlots = avail || 0;
      }
    } else {
      const { count: avail } = await supabase
        .from("parking_slots")
        .select("*", { count: "exact", head: true })
        .eq("status", "available");
      availableSlots = avail || 0;
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalStaff: totalStaff || 0,
        activeStaff: activeStaff || 0,
        totalCustomers: totalCustomers || 0,
        activeParkingSessions: activeParkingSessions || 0,
        openIncidents: openIncidents || 0,
        todayRevenue: todayRevenue || 0,
        totalVehicles: totalVehicles || 0,
        todayCheckouts: todayCheckouts || 0,
        availableSlots: availableSlots || 0,
        revenueToday: todayRevenue || 0,
        hotelId: hotelId || "all"
      }
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics."
    });
  }
};

const getRevenuePerformance = async (req, res) => {
  try {
    const days = Number(req.query.days || 7);
    let hotelId = req.query.hotelId || req.query.hotel_id;
    if (req.user?.role === "manager" || req.user?.role === "parking_admin") {
      const userScope = await getAreaScope(req.user);
      if (userScope.buildingId) {
        hotelId = userScope.buildingId;
      }
    }
    if (![7, 30, 90].includes(days)) {
      return res.status(400).json({
        success: false,
        message: "Revenue period must be 7, 30, or 90 days.",
      });
    }

    const scope = await getHotelScope(hotelId);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - days + 1);

    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    const revenueByDate = new Map();
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      let query = supabase
        .from("payments")
        .select("total_amount, paid_at, parking_session_id")
        .eq("payment_status", "paid")
        .gte("paid_at", startDate.toISOString())
        .lt("paid_at", endDate.toISOString())
        .order("paid_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (scope.isFiltered && scope.sessionIds.length > 0) {
        query = query.in("parking_session_id", scope.sessionIds);
      } else if (scope.isFiltered && scope.sessionIds.length === 0) {
        // No sessions for this hotel
        break;
      }

      const { data: payments, error } = await query;
      if (error) throw error;

      for (const payment of payments || []) {
        const date = new Date(payment.paid_at).toISOString().slice(0, 10);
        revenueByDate.set(
          date,
          (revenueByDate.get(date) || 0) + Number(payment.total_amount || 0)
        );
      }

      if (!payments || payments.length < pageSize) break;
      offset += pageSize;
    }

    const revenue = [];
    for (let index = 0; index < days; index += 1) {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0, 10);

      revenue.push({
        date: dateKey,
        value: revenueByDate.get(dateKey) || 0,
      });
    }

    return res.status(200).json({ success: true, days, revenue, hotelId: hotelId || "all" });
  } catch (error) {
    console.error("Revenue performance error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch revenue performance.",
    });
  }
};

/**
 * getDashboardAnalytics
 * Returns real-time data for the luxury graphical dashboard:
 *   - hourlyTrend:      Vehicle count by hour for today (8 AM – 10 PM)
 *   - vehicleTypes:     Distribution categorized by make & model
 *   - recentActivity:   Last 10 parking session events with live statuses
 *   - todayCheckouts:   Count of returned_completed sessions today
 *   - totalVehiclesToday: Total sessions created today (or past 24h)
 *   - satisfaction:     Average rating (from feedback table, falls back to 4.8)
 */
const getDashboardAnalytics = async (req, res) => {
  try {
    let hotelId = req.query.hotelId || req.query.hotel_id;
    if (req.user?.role === "manager" || req.user?.role === "parking_admin") {
      const userScope = await getAreaScope(req.user);
      if (userScope.buildingId) {
        hotelId = userScope.buildingId;
      }
    }
    const scope = await getHotelScope(hotelId);

    const now = new Date();
    const kolkataDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
    const startISO = new Date(`${kolkataDate}T00:00:00+05:30`).toISOString();

    const past24hISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const past7DaysISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. All sessions created today with vehicle info
    let sessionQuery = supabase
      .from("parking_sessions")
      .select(`
        id,
        ticket_code,
        parking_type,
        status,
        parking_slot,
        checked_in_at,
        parked_at,
        completed_at,
        vehicle:vehicles (
          id,
          license_plate,
          make,
          model,
          color
        )
      `)
      .gte("checked_in_at", startISO)
      .order("checked_in_at", { ascending: false });

    if (scope.isFiltered) {
      if (scope.slotNumbers.length > 0) {
        sessionQuery = sessionQuery.in("parking_slot", scope.slotNumbers);
      } else {
        sessionQuery = sessionQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    let { data: sessions, error: sessionsError } = await sessionQuery;
    if (sessionsError) throw sessionsError;

    // Fallback logic for trend calculation so charts are never flat/empty if today has 0 sessions
    let trendSessions = sessions && sessions.length > 0 ? [...sessions] : [];
    if (trendSessions.length === 0) {
      let pastQuery = supabase
        .from("parking_sessions")
        .select(`
          id,
          ticket_code,
          parking_type,
          status,
          parking_slot,
          checked_in_at,
          parked_at,
          completed_at,
          vehicle:vehicles (
            id,
            license_plate,
            make,
            model,
            color
          )
        `)
        .gte("checked_in_at", past7DaysISO)
        .order("checked_in_at", { ascending: false });

      if (scope.isFiltered) {
        if (scope.slotNumbers.length > 0) {
          pastQuery = pastQuery.in("parking_slot", scope.slotNumbers);
        } else {
          pastQuery = pastQuery.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data: pastSessions } = await pastQuery;

      if (pastSessions && pastSessions.length > 0) {
        trendSessions = pastSessions;
      } else {
        let latestQuery = supabase
          .from("parking_sessions")
          .select(`
            id,
            ticket_code,
            parking_type,
            status,
            parking_slot,
            checked_in_at,
            parked_at,
            completed_at,
            vehicle:vehicles (
              id,
              license_plate,
              make,
              model,
              color
            )
          `)
          .order("checked_in_at", { ascending: false })
          .limit(100);

        if (scope.isFiltered) {
          if (scope.slotNumbers.length > 0) {
            latestQuery = latestQuery.in("parking_slot", scope.slotNumbers);
          } else {
            latestQuery = latestQuery.eq("id", "00000000-0000-0000-0000-000000000000");
          }
        }

        const { data: latestSessions } = await latestQuery;
        trendSessions = latestSessions || [];
      }
    }

    // 2. Hourly trend (8 AM – 10 PM buckets) in Asia/Kolkata
    const hourlyTrend = [];
    for (let h = 8; h <= 22; h += 2) {
      const label =
        h === 12
          ? "12 PM"
          : h < 12
          ? `${h} AM`
          : `${h - 12} PM`;

      const count = (trendSessions || []).filter((s) => {
        if (!s.checked_in_at) return false;
        const d = new Date(s.checked_in_at);
        const kolkataHourStr = new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          hour12: false,
          timeZone: "Asia/Kolkata"
        }).format(d);
        const hour = parseInt(kolkataHourStr, 10);
        return hour >= h && hour < h + 2;
      }).length;

      hourlyTrend.push({ time: label, value: count });
    }

    // Weekly trend (last 7 days by day name: Mon, Tue, etc.) in Asia/Kolkata
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const targetDateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(targetDate);
      const dayName = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }).format(targetDate);

      const count = (trendSessions || []).filter((s) => {
        if (!s.checked_in_at) return false;
        const sKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(s.checked_in_at));
        return sKey === targetDateKey;
      }).length;

      weeklyTrend.push({ time: dayName, value: count });
    }

    // 3. Vehicle categorization helper based on make and model
    const categorizeVehicle = (make = "", model = "") => {
      const text = `${make || ""} ${model || ""}`.toLowerCase().trim();

      const SUV_KEYWORDS = [
        "suv", "fortunar", "fortuner", "thar", "scorpio", "creta",
        "seltos", "brezza", "safari", "harrier", "nexon", "xuv",
        "innova", "ertiga", "compass", "defender", "duster",
        "tiago", "punch", "venue", "sonet", "hector", "taigun",
        "kushaq", "vitara", "hyryder", "tucson", "evoque"
      ];
      const LUXURY_KEYWORDS = [
        "bmw", "mercedes", "audi", "jaguar", "land rover",
        "range rover", "porsche", "lexus", "volvo", "bentley",
        "rolls", "rolls-royce", "maybach", "mini"
      ];
      const SPORTS_KEYWORDS = [
        "ferrari", "lamborghini", "sports", "mustang", "gt",
        "maserati", "mclaren", "bugatti", "supra", "corvette"
      ];
      const SEDAN_KEYWORDS = [
        "sedan", "city", "verna", "civic", "accord", "camry",
        "corolla", "octavia", "superb", "slavia", "virtus",
        "dzire", "amaze", "ciaz", "etios", "aura", "tigor", "passat"
      ];

      if (SPORTS_KEYWORDS.some((kw) => text.includes(kw))) return "Sports";
      if (LUXURY_KEYWORDS.some((kw) => text.includes(kw))) return "Luxury";
      if (SUV_KEYWORDS.some((kw) => text.includes(kw))) return "SUV";
      if (SEDAN_KEYWORDS.some((kw) => text.includes(kw))) return "Sedan";

      return "Others";
    };

    // Query sessions for vehicle categorization
    let allSessionsQuery = supabase
      .from("parking_sessions")
      .select("vehicle:vehicles ( make, model ), parking_slot")
      .order("checked_in_at", { ascending: false })
      .limit(500);

    if (scope.isFiltered) {
      if (scope.slotNumbers.length > 0) {
        allSessionsQuery = allSessionsQuery.in("parking_slot", scope.slotNumbers);
      } else {
        allSessionsQuery = allSessionsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    const { data: allSessions } = await allSessionsQuery;

    const categoryCounts = { Sedan: 0, SUV: 0, Luxury: 0, Sports: 0, Others: 0 };
    let totalCategorized = 0;

    (allSessions || []).forEach((s) => {
      if (s.vehicle) {
        const cat = categorizeVehicle(s.vehicle.make, s.vehicle.model);
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        totalCategorized++;
      }
    });

    if (totalCategorized === 0 && !scope.isFiltered) {
      const { data: allRegisteredVehicles } = await supabase
        .from("vehicles")
        .select("make, model")
        .limit(500);

      (allRegisteredVehicles || []).forEach((v) => {
        const cat = categorizeVehicle(v.make, v.model);
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        totalCategorized++;
      });
    }

    const COLORS = {
      Sedan: "#42235e",
      SUV: "#6c349c",
      Luxury: "#bc9b6a",
      Sports: "#8e5ab5",
      Others: "#240f35",
    };

    const vehicleTypes = Object.entries(categoryCounts).map(([label, count]) => ({
      label,
      count,
      percentage: totalCategorized > 0 ? Math.round((count / totalCategorized) * 100) : 0,
      color: COLORS[label],
    }));

    // 4. Recent activity (last 10 sessions)
    let recentQuery = supabase
      .from("parking_sessions")
      .select(`
        id,
        ticket_code,
        parking_type,
        status,
        parking_slot,
        checked_in_at,
        completed_at,
        vehicle:vehicles (
          id,
          license_plate,
          make,
          model,
          color
        )
      `)
      .order("checked_in_at", { ascending: false })
      .limit(10);

    if (scope.isFiltered) {
      if (scope.slotNumbers.length > 0) {
        recentQuery = recentQuery.in("parking_slot", scope.slotNumbers);
      } else {
        recentQuery = recentQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    const { data: recentSessions, error: recentError } = await recentQuery;
    if (recentError) throw recentError;

    const recentActivity = (recentSessions || []).map((s) => {
      const isCheckout = ["returned_completed", "ready_for_pickup"].includes(s.status);
      const eventTime = isCheckout && s.completed_at ? s.completed_at : s.checked_in_at;
      const d = eventTime ? new Date(eventTime) : new Date();
      const timeStr = d.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });

      const typeLabel = categorizeVehicle(s.vehicle?.make, s.vehicle?.model);

      let action = "Check In";
      let status = "Parked";
      let statusClass = "status-parked";

      if (s.status === "returned_completed") {
        action = "Check Out";
        status = "Departed";
        statusClass = "status-departed";
      } else if (s.status === "ready_for_pickup") {
        action = "Retrieval";
        status = "Ready";
        statusClass = "status-ready";
      } else if (s.status === "retrieval_requested" || s.status === "retrieving") {
        action = "Retrieval";
        status = "Retrieving";
        statusClass = "status-retrieval";
      } else if (s.status === "checked_in") {
        action = "Check In";
        status = "Received";
        statusClass = "status-checked-in";
      }

      return {
        id: s.id,
        time: timeStr,
        vehicleNo: s.vehicle?.license_plate || s.ticket_code || "—",
        type: typeLabel,
        action,
        status,
        statusClass,
      };
    });

    // 5. Today's checkout count
    const todayCheckouts = (sessions || []).filter(
      (s) => s.status === "returned_completed"
    ).length;

    // 6. Active sessions count
    let activeQuery = supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .in("status", ["checked_in", "parked", "retrieval_requested", "retrieving"]);

    if (scope.isFiltered) {
      if (scope.slotNumbers.length > 0) {
        activeQuery = activeQuery.in("parking_slot", scope.slotNumbers);
      } else {
        activeQuery = activeQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    const { count: activeParkingSessions, error: activeErr } = await activeQuery;
    if (activeErr) throw activeErr;

    // 7. Customer satisfaction
    let satisfaction = 4.8;
    try {
      let feedbackQuery = supabase
        .from("feedback")
        .select("rating, parking_session_id")
        .not("rating", "is", null);

      if (scope.isFiltered && scope.sessionIds.length > 0) {
        feedbackQuery = feedbackQuery.in("parking_session_id", scope.sessionIds);
      }

      const { data: feedbackRows } = await feedbackQuery;

      if (feedbackRows && feedbackRows.length > 0) {
        const avg =
          feedbackRows.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
          feedbackRows.length;
        satisfaction = Math.round(avg * 10) / 10;
      }
    } catch {
      // ignore
    }

    // 8. Staff breakdown by role
    let staffBreakdown = { manager: 0, valet: 0, total: 0 };
    try {
      let staffQuery = supabase.from("users").select("role, is_active").eq("is_active", true);
      if (scope.isFiltered && scope.staffUserIds && scope.staffUserIds.length > 0) {
        staffQuery = staffQuery.in("id", scope.staffUserIds);
      }
      const { data: staffRows } = await staffQuery;
      if (staffRows) {
        staffRows.forEach((u) => {
          const r = u.role === "parking_admin" ? "manager" : u.role === "valet" ? "valet" : "other";
          staffBreakdown[r] = (staffBreakdown[r] || 0) + 1;
          staffBreakdown.total++;
        });
      }
    } catch { /* ignore */ }

    // 9. Incident breakdown by type + 4-week trend
    let incidentBreakdown = [];
    let incidentTrend = [];
    try {
      let incQuery = supabase.from("incidents").select("incident_type, status, created_at");
      if (scope.isFiltered && scope.sessionIds && scope.sessionIds.length > 0) {
        incQuery = incQuery.in("parking_session_id", scope.sessionIds);
      }
      const { data: incRows } = await incQuery;
      if (incRows) {
        const byType = {};
        incRows.forEach((i) => { const t = i.incident_type || "other"; byType[t] = (byType[t] || 0) + 1; });
        incidentBreakdown = Object.entries(byType).map(([type, count]) => ({ type, count }));
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        for (let weekIndex = 3; weekIndex >= 0; weekIndex--) {
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() - (weekIndex * 7));
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekEnd.getDate() - 6);
          weekStart.setHours(0, 0, 0, 0);
          const count = incRows.filter((incident) => {
            if (!incident.created_at) return false;
            const incidentDate = new Date(incident.created_at);
            return incidentDate >= weekStart && incidentDate <= weekEnd;
          }).length;
          incidentTrend.push({ week: `Week ${4 - weekIndex}`, count });
        }
      }
    } catch { /* ignore */ }

    return res.status(200).json({
      success: true,
      analytics: {
        totalVehiclesToday: (sessions || []).length,
        totalVehiclesAllTime: totalCategorized,
        activeParkingSessions: activeParkingSessions || 0,
        todayCheckouts,
        satisfaction,
        hourlyTrend,
        weeklyTrend,
        vehicleTypes,
        recentActivity,
        hotelId: hotelId || "all",
        staffBreakdown,
        incidentBreakdown,
        incidentTrend,
      },
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard analytics.",
    });
  }
};

module.exports = {
  getDashboardStats,
  getDashboardAnalytics,
  getRevenuePerformance,
};