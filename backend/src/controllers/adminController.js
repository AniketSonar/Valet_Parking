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

module.exports = {
  getDashboardStats
};