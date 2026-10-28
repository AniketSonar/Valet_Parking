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

      const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

const { data: todayPayments, error: paymentError } = await supabase
  .from("payments")
  .select("total_amount")
  .eq("payment_status", "paid")
  .gte("paid_at", startOfDay.toISOString());

if (paymentError) {
  throw paymentError;
}

const todayRevenue = todayPayments.reduce(
  (total, payment) => total + Number(payment.total_amount || 0),
  0
);

    return res.status(200).json({
      success: true,
      stats: {
        totalStaff: totalStaff || 0,
        activeStaff: activeStaff || 0,
        totalCustomers: totalCustomers || 0,
        activeParkingSessions: activeParkingSessions || 0,
        openIncidents: openIncidents || 0,
        todayRevenue: todayRevenue || 0
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startISO = startOfDay.toISOString();

    // Past 24 hours timestamp for fallback if today is early/empty
    const past24hISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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

    // If no sessions today, check past 24 hours so analytics remain live and meaningful
    let is24hFallback = false;
    if (!sessions || sessions.length === 0) {
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
        .gte("checked_in_at", past24hISO)
        .order("checked_in_at", { ascending: false });

      if (pastSessions && pastSessions.length > 0) {
        sessions = pastSessions;
        is24hFallback = true;
      } else {
        sessions = [];
      }
    }

    // 2. Hourly trend (8 AM – 10 PM buckets)
    const hourlyTrend = [];
    for (let h = 8; h <= 22; h += 2) {
      const label =
        h === 12
          ? "12 PM"
          : h < 12
          ? `${h} AM`
          : `${h - 12} PM`;

      const count = sessions.filter((s) => {
        const hour = new Date(s.checked_in_at).getHours();
        return hour >= h && hour < h + 2;
      }).length;

      hourlyTrend.push({ time: label, value: count });
    }

    // 3. Vehicle categorization helper based on make and model
    const categorizeVehicle = (make = "", model = "") => {
      const text = `${make} ${model}`.toLowerCase();

      const SUV_KEYWORDS = [
        "suv", "fortunar", "fortuner", "thar", "scorpio", "creta",
        "seltos", "brezza", "safari", "harrier", "nexon", "xuv",
        "innova", "ertiga", "compass", "defender", "duster"
      ];
      const LUXURY_KEYWORDS = [
        "bmw", "mercedes", "audi", "jaguar", "land rover",
        "range rover", "porsche", "lexus", "volvo", "bentley",
        "rolls", "rolls-royce", "maybach"
      ];
      const SPORTS_KEYWORDS = [
        "ferrari", "lamborghini", "sports", "mustang", "gt",
        "maserati", "mclaren", "bugatti", "supra"
      ];
      const SEDAN_KEYWORDS = [
        "sedan", "city", "verna", "civic", "accord", "camry",
        "corolla", "octavia", "superb", "slavia", "virtus",
        "dzire", "amaze", "ciaz", "etios"
      ];

      if (SPORTS_KEYWORDS.some((kw) => text.includes(kw))) return "Sports";
      if (LUXURY_KEYWORDS.some((kw) => text.includes(kw))) return "Luxury";
      if (SUV_KEYWORDS.some((kw) => text.includes(kw))) return "SUV";
      if (SEDAN_KEYWORDS.some((kw) => text.includes(kw))) return "Sedan";

      return "Sedan"; // Default car classification
    };

    const categoryCounts = { Sedan: 0, SUV: 0, Luxury: 0, Sports: 0, Others: 0 };
    sessions.forEach((s) => {
      const cat = categorizeVehicle(s.vehicle?.make, s.vehicle?.model);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const totalCategorized = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
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
      const d = new Date(eventTime);
      const timeStr = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
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
    const todayCheckouts = sessions.filter(
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
        totalVehiclesToday: sessions.length,
        activeParkingSessions: activeParkingSessions || 0,
        todayCheckouts,
        satisfaction,
        hourlyTrend,
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
  getDashboardAnalytics
};