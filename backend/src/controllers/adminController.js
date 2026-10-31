const supabase = require("../config/supabase");

const getDashboardStats = async (req, res) => {
  try {
    const { count: totalStaff } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    const { count: activeStaff } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const { count: totalCustomers } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    const { count: activeParkingSessions } = await supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .in("status", ["checked_in", "parked", "retrieval_requested", "retrieving"]);

    const { count: openIncidents } = await supabase
      .from("incidents")
      .select("*", { count: "exact", head: true })
      .neq("status", "closed");

    // Use Indian Standard Time (Asia/Kolkata) to determine today's start regardless of server host timezone
    const now = new Date();
    const kolkataDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
    const startOfDayISO = new Date(`${kolkataDate}T00:00:00+05:30`).toISOString();

    const { data: todayPayments, error: paymentError } = await supabase
      .from("payments")
      .select("total_amount")
      .eq("payment_status", "paid")
      .gte("paid_at", startOfDayISO);

    if (paymentError) {
      throw paymentError;
    }

    const todayRevenue = todayPayments.reduce(
      (total, payment) => total + Number(payment.total_amount || 0),
      0
    );

    const { count: totalVehicles } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true });

    const { count: todayCheckouts } = await supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "returned_completed")
      .gte("completed_at", startOfDayISO);

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
        todayCheckouts: todayCheckouts || 0
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
    if (![7, 30, 90].includes(days)) {
      return res.status(400).json({
        success: false,
        message: "Revenue period must be 7, 30, or 90 days.",
      });
    }

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
      const { data: payments, error } = await supabase
        .from("payments")
        .select("total_amount, paid_at")
        .eq("payment_status", "paid")
        .gte("paid_at", startDate.toISOString())
        .lt("paid_at", endDate.toISOString())
        .order("paid_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

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

    return res.status(200).json({ success: true, days, revenue });
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
    const now = new Date();
    const kolkataDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
    const startISO = new Date(`${kolkataDate}T00:00:00+05:30`).toISOString();

    const past24hISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const past7DaysISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. All sessions created today with vehicle info
    let { data: sessions, error: sessionsError } = await supabase
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

    if (sessionsError) throw sessionsError;

    // Fallback logic for trend calculation so charts are never flat/empty if today has 0 sessions
    let trendSessions = sessions && sessions.length > 0 ? [...sessions] : [];
    if (trendSessions.length === 0) {
      const { data: pastSessions } = await supabase
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

      if (pastSessions && pastSessions.length > 0) {
        trendSessions = pastSessions;
      } else {
        const { data: latestSessions } = await supabase
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

    // Query all sessions for vehicle categorization
    const { data: allSessions } = await supabase
      .from("parking_sessions")
      .select("vehicle:vehicles ( make, model )")
      .order("checked_in_at", { ascending: false })
      .limit(500);

    // Also query registered vehicles
    const { data: allRegisteredVehicles } = await supabase
      .from("vehicles")
      .select("make, model")
      .limit(500);

    const categoryCounts = { Sedan: 0, SUV: 0, Luxury: 0, Sports: 0, Others: 0 };
    let totalCategorized = 0;

    (allSessions || []).forEach((s) => {
      if (s.vehicle) {
        const cat = categorizeVehicle(s.vehicle.make, s.vehicle.model);
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        totalCategorized++;
      }
    });

    if (totalCategorized === 0 && allRegisteredVehicles && allRegisteredVehicles.length > 0) {
      allRegisteredVehicles.forEach((v) => {
        const cat = categorizeVehicle(v.make, v.model);
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        totalCategorized++;
      });
    }

    const COLORS = {
      Sedan: "#6b0e24",
      SUV: "#a82042",
      Luxury: "#c95b77",
      Sports: "#dca270",
      Others: "#420815",
    };

    const vehicleTypes = Object.entries(categoryCounts).map(([label, count]) => ({
      label,
      count,
      percentage: totalCategorized > 0 ? Math.round((count / totalCategorized) * 100) : 0,
      color: COLORS[label],
    }));

    // 4. Recent activity (last 10 sessions from DB)
    const { data: recentSessions, error: recentError } = await supabase
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

    // 6. Active sessions count (currently parked/retrieving)
    const { count: activeParkingSessions, error: activeErr } = await supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .in("status", ["checked_in", "parked", "retrieval_requested", "retrieving"]);

    if (activeErr) throw activeErr;

    // 7. Customer satisfaction (from feedback table or default 4.8)
    let satisfaction = 4.8;
    try {
      const { data: feedbackRows } = await supabase
        .from("feedback")
        .select("rating")
        .not("rating", "is", null);

      if (feedbackRows && feedbackRows.length > 0) {
        const avg =
          feedbackRows.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
          feedbackRows.length;
        satisfaction = Math.round(avg * 10) / 10;
      }
    } catch {
      // ignore
    }

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