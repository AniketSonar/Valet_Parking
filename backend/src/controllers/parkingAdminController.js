const supabase = require("../config/supabase");
const { getAreaScope, applyFloorScope } = require("../utils/areaScope");

const getParkingAdminDashboard = async (req, res) => {
  try {
    const scope = await getAreaScope(req.user);
    const slotCount = () =>
      applyFloorScope(
        supabase.from("parking_slots").select("*", { count: "exact", head: true }),
        scope
      );

    const { count: totalSlots, error: totalSlotsError } = await slotCount();

    if (totalSlotsError) throw totalSlotsError;

    const { count: availableSlots, error: availableSlotsError } = await slotCount().eq("status", "available");

    if (availableSlotsError) throw availableSlotsError;

    const { count: occupiedSlots, error: occupiedSlotsError } = await slotCount().eq("status", "occupied");

    if (occupiedSlotsError) throw occupiedSlotsError;

    const { count: maintenanceSlots, error: maintenanceSlotsError } =
      await slotCount().eq("status", "maintenance");

    if (maintenanceSlotsError) throw maintenanceSlotsError;

    let activeSessionsQuery = supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .in("status", [
        "checked_in",
        "parked",
        "retrieval_requested",
        "retrieving"
      ]);

    let pendingRetrievalsQuery = supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "retrieval_requested");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let todayCheckInsQuery = supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .gte("checked_in_at", startOfDay.toISOString());

    let todayCompletedReturnsQuery = supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "returned_completed")
      .gte("completed_at", startOfDay.toISOString());

    if (!scope.unrestricted) {
      if (scope.slotNumbers && scope.slotNumbers.length > 0) {
        activeSessionsQuery = activeSessionsQuery.in("parking_slot", scope.slotNumbers);
        pendingRetrievalsQuery = pendingRetrievalsQuery.in("parking_slot", scope.slotNumbers);
        todayCheckInsQuery = todayCheckInsQuery.in("parking_slot", scope.slotNumbers);
        todayCompletedReturnsQuery = todayCompletedReturnsQuery.in("parking_slot", scope.slotNumbers);
      } else {
        const nullId = "00000000-0000-0000-0000-000000000000";
        activeSessionsQuery = activeSessionsQuery.eq("id", nullId);
        pendingRetrievalsQuery = pendingRetrievalsQuery.eq("id", nullId);
        todayCheckInsQuery = todayCheckInsQuery.eq("id", nullId);
        todayCompletedReturnsQuery = todayCompletedReturnsQuery.eq("id", nullId);
      }
    }

    const { count: activeSessions, error: activeSessionsError } = await activeSessionsQuery;
    if (activeSessionsError) throw activeSessionsError;

    const { count: pendingRetrievals, error: pendingRetrievalsError } = await pendingRetrievalsQuery;
    if (pendingRetrievalsError) throw pendingRetrievalsError;

    const { count: todayCheckIns, error: todayCheckInsError } = await todayCheckInsQuery;
    if (todayCheckInsError) throw todayCheckInsError;

    const { count: todayCompletedReturns, error: todayCompletedReturnsError } = await todayCompletedReturnsQuery;
    if (todayCompletedReturnsError) throw todayCompletedReturnsError;

    let paymentQuery = supabase
      .from("payments")
      .select("total_amount")
      .eq("payment_status", "paid")
      .gte("paid_at", startOfDay.toISOString());

    if (!scope.unrestricted) {
      if (scope.slotNumbers && scope.slotNumbers.length > 0) {
        const { data: bSessions } = await supabase
          .from("parking_sessions")
          .select("id")
          .in("parking_slot", scope.slotNumbers);
        const sIds = (bSessions || []).map((s) => s.id);
        if (sIds.length > 0) {
          paymentQuery = paymentQuery.in("session_id", sIds);
        } else {
          paymentQuery = paymentQuery.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      } else {
        paymentQuery = paymentQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    const { data: todayPayments, error: paymentError } = await paymentQuery;
    if (paymentError) throw paymentError;

    const todayRevenue = (todayPayments || []).reduce(
      (total, payment) => total + Number(payment.total_amount || 0),
      0
    );

    // Fetch manager's assigned building details
    let assignedHotel = null;
    if (scope.buildingId) {
      const { data: bld } = await supabase
        .from("parking_buildings")
        .select("id, building_name, address")
        .eq("id", scope.buildingId)
        .maybeSingle();
      if (bld) {
        assignedHotel = {
          ...bld,
          name: bld.building_name,
        };
      }
    }

    return res.status(200).json({
      success: true,
      hotel: assignedHotel,
      assigned_hotel_id: scope.buildingId,
      assigned_hotel_name: assignedHotel?.building_name || null,
      stats: {
        totalSlots: totalSlots || 0,
        availableSlots: availableSlots || 0,
        occupiedSlots: occupiedSlots || 0,
        maintenanceSlots: maintenanceSlots || 0,
        activeSessions: activeSessions || 0,
        pendingRetrievals: pendingRetrievals || 0,
        todayCheckIns: todayCheckIns || 0,
        todayCompletedReturns: todayCompletedReturns || 0,
        todayRevenue
      }
    });
  } catch (error) {
    console.error("Parking Admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch Parking Admin dashboard statistics."
    });
  }
};

const getParkingStaff = async (req, res) => {
  try {
    const { data: staff, error } = await supabase
      .from("users")
      .select("id, name, email, role, is_active, created_at")
      .in("role", ["valet", "reception_security", "cashier"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get parking staff error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const staffWithValetIds = await Promise.all(
      (staff || []).map(async (member) => {
        if (member.role !== "valet") {
          return member;
        }

        const { data: employee, error: employeeError } = await supabase
          .from("employees")
          .select("id, name, phone, role, email, is_active")
          .eq("email", member.email)
          .eq("role", "valet")
          .maybeSingle();

        if (employeeError || !employee) {
          console.error(
            "Employee mapping error for valet:",
            member.email,
            employeeError
          );

          return null;
        }

        return {
          ...member,
          id: employee.id,
          user_id: member.id
        };
      })
    );

    let filteredStaff = staffWithValetIds.filter(Boolean);

    // Managers only work with valets posted in their own area.
    if (req.user?.role === "manager") {
      const scope = await getAreaScope(req.user);

      const { data: posted } = await applyFloorScope(
        supabase
          .from("valet_assignments")
          .select("valet_id, is_active, post:valet_posts ( post_name )"),
        scope
      );

      const postByValet = new Map();
      (posted || [])
        .sort((a, b) => Number(b.is_active) - Number(a.is_active))
        .forEach((row) => {
          if (!postByValet.has(row.valet_id)) {
            postByValet.set(row.valet_id, row.post?.post_name || null);
          }
        });

      filteredStaff = filteredStaff
        .filter((member) => member.role !== "valet" || postByValet.has(member.id))
        .map((member) => ({
          ...member,
          post_name: postByValet.get(member.id) || null
        }));
    }

    return res.status(200).json({
      success: true,
      count: filteredStaff.length,
      staff: filteredStaff
    });
  } catch (error) {
    console.error("Get parking staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parking staff."
    });
  }
};

const getParkingReports = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const { count: dailyCheckIns, error: checkInError } =
      await supabase
        .from("parking_sessions")
        .select("*", { count: "exact", head: true })
        .gte("checked_in_at", startOfDay.toISOString())
        .lte("checked_in_at", endOfDay.toISOString());

    if (checkInError) throw checkInError;

    const { count: dailyCheckOuts, error: checkOutError } =
      await supabase
        .from("parking_sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "returned_completed")
        .gte("completed_at", startOfDay.toISOString())
        .lte("completed_at", endOfDay.toISOString());

    if (checkOutError) throw checkOutError;

    const { count: totalSlots, error: totalSlotsError } =
      await supabase
        .from("parking_slots")
        .select("*", { count: "exact", head: true });

    if (totalSlotsError) throw totalSlotsError;

    const { count: occupiedSlots, error: occupiedSlotsError } =
      await supabase
        .from("parking_slots")
        .select("*", { count: "exact", head: true })
        .eq("status", "occupied");

    if (occupiedSlotsError) throw occupiedSlotsError;

    const { count: retrievalRequests, error: retrievalError } =
      await supabase
        .from("parking_sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "retrieval_requested");

    if (retrievalError) throw retrievalError;

    const { count: activeRetrievals, error: activeRetrievalError } =
      await supabase
        .from("parking_sessions")
        .select("*", { count: "exact", head: true })
        .in("status", ["retrieving", "ready_for_pickup"]);

    if (activeRetrievalError) throw activeRetrievalError;

    const occupancyRate =
      totalSlots > 0
        ? Math.round((occupiedSlots / totalSlots) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      reports: {
        dailyCheckIns: dailyCheckIns || 0,
        dailyCheckOuts: dailyCheckOuts || 0,
        totalSlots: totalSlots || 0,
        occupiedSlots: occupiedSlots || 0,
        occupancyRate,
        retrievalRequests: retrievalRequests || 0,
        activeRetrievals: activeRetrievals || 0
      }
    });
  } catch (error) {
    console.error("Parking reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parking reports."
    });
  }
};

const getParkingAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, is_active, created_at, auth_user_id")
      .eq("id", userId)
      .in("role", ["parking_admin", "manager", "super_admin"])
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: "Parking Admin profile not found."
      });
    }

    let assignedHotel = null;
    const { data: ma } = await supabase
      .from("manager_assignments")
      .select(`
        floor:parking_floors (
          id,
          building:parking_buildings ( id, building_name, address )
        )
      `)
      .eq("manager_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (ma?.floor?.building) {
      assignedHotel = ma.floor.building;
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        assigned_hotel_id: assignedHotel?.id || null,
        assigned_hotel_name: assignedHotel?.building_name || null,
        assigned_hotel: assignedHotel
      }
    });
  } catch (error) {
    console.error("Get Parking Admin profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile."
    });
  }
};

module.exports = {
  getParkingAdminDashboard,
  getParkingStaff,
  getParkingReports,
  getParkingAdminProfile
};