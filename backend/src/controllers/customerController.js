const supabase = require("../config/supabase");
const crypto = require("crypto");

const generateBookingCode = async () => {
  let bookingCode;
  let exists = true;

  while (exists) {
    const randomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    bookingCode = `BK-${randomCode}`;

    const { data } = await supabase
      .from("parking_bookings")
      .select("id")
      .eq("booking_code", bookingCode)
      .maybeSingle();

    exists = !!data;
  }

  return bookingCode;
};

const createCustomer = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Customer name and phone number are required.",
      });
    }

    const { data: existingCustomer, error: existingError } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone.trim())
      .maybeSingle();

    if (existingError) {
      console.error("Check existing customer error:", existingError);
      return res.status(400).json({
        success: false,
        message: existingError.message,
      });
    }

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: `This mobile number is already registered to ${existingCustomer.name}. Use a different mobile number.`,
      });
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .insert([
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Create customer error:", error);
      return res.status(400).json({
        success: false,
        message: error.code === "23505"
          ? "This mobile number is already registered. Use a different mobile number."
          : error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create customer.",
    });
  }
};

const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;

    let query = supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        email,
        created_at,
        vehicles (
          id,
          license_plate,
          make,
          model,
          color
        )
      `)
      .order("name", { ascending: true });

    if (search) {
      const searchTerm = search.trim();
      query = query.or(
        `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      );
    }

    const { data: customers, error } = await query;

    if (error) {
      console.error("Get customers error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      count: customers.length,
      customers: customers || [],
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers.",
    });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: customer, error } = await supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        email,
        created_at,
        vehicles (
          id,
          license_plate,
          make,
          model,
          color
        )
      `)
      .eq("id", id)
      .single();

    if (error || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get customer by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer.",
    });
  }
};

const getPortalCustomer = async (req) => {
  if (req.customer) return req.customer;

  if (req.user?.phone) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, name, phone, email, created_at")
      .eq("phone", req.user.phone)
      .maybeSingle();

    if (customer) return customer;
  }

  if (!req.user?.email) return null;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, email, created_at")
    .eq("email", req.user.email)
    .single();

  return customer;
};

const createCustomerBooking = async (req, res) => {
  try {
    const customer = await getPortalCustomer(req);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found.",
      });
    }

    const {
      vehicle_id,
      parking_type,
      expected_arrival_at,
      notes,
    } = req.body;

    if (!vehicle_id || !parking_type || !expected_arrival_at) {
      return res.status(400).json({
        success: false,
        message:
          "vehicle_id, parking_type and expected_arrival_at are required.",
      });
    }

    if (!["valet", "self"].includes(parking_type)) {
      return res.status(400).json({
        success: false,
        message: "parking_type must be either valet or self.",
      });
    }

    const arrivalDate = new Date(expected_arrival_at);

    if (isNaN(arrivalDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid expected_arrival_at.",
      });
    }

    if (arrivalDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expected arrival must be in the future.",
      });
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select(
        "id, customer_id, license_plate, make, model, color"
      )
      .eq("id", vehicle_id)
      .eq("customer_id", customer.id)
      .single();

    if (vehicleError || !vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found for this customer.",
      });
    }

    const { data: activeSession } = await supabase
      .from("parking_sessions")
      .select("id, status")
      .eq("vehicle_id", vehicle_id)
      .in("status", [
        "checked_in",
        "parked",
        "retrieval_requested",
        "retrieving",
        "ready_for_pickup",
      ])
      .maybeSingle();

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message:
          "This vehicle currently has an active parking session and cannot be pre-booked.",
      });
    }

    const arrivalStart = new Date(arrivalDate.getTime() - 60 * 60 * 1000);
    const arrivalEnd = new Date(arrivalDate.getTime() + 60 * 60 * 1000);

    const { data: existingBookings, error: bookingCheckError } =
      await supabase
        .from("parking_bookings")
        .select("id, booking_code, expected_arrival_at, status")
        .eq("vehicle_id", vehicle_id)
        .in("status", ["booked", "expected"])
        .gte("expected_arrival_at", arrivalStart.toISOString())
        .lte("expected_arrival_at", arrivalEnd.toISOString());

    if (bookingCheckError) {
      return res.status(400).json({
        success: false,
        message: bookingCheckError.message,
      });
    }

    if (existingBookings?.length) {
      return res.status(409).json({
        success: false,
        message:
          "This vehicle already has a pre-booking around the selected arrival time.",
        booking: existingBookings[0],
      });
    }

    const bookingCode = await generateBookingCode();

    const { data: booking, error: bookingError } = await supabase
      .from("parking_bookings")
      .insert({
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        parking_type,
        booking_code: bookingCode,
        expected_arrival_at: arrivalDate.toISOString(),
        status: "booked",
        contact_phone: customer.phone,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (bookingError) {
      return res.status(400).json({
        success: false,
        message: bookingError.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Parking pre-booking created successfully.",
      booking: {
        ...booking,
        customer,
        vehicle,
      },
    });
  } catch (error) {
    console.error("Create customer booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create parking pre-booking.",
    });
  }
};

const getCustomerBookings = async (req, res) => {
  try {
    const customer = await getPortalCustomer(req);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found.",
      });
    }

    const { data: bookings, error } = await supabase
      .from("parking_bookings")
      .select(`
        id,
        booking_code,
        parking_type,
        expected_arrival_at,
        status,
        contact_phone,
        notes,
        created_at,
        vehicle:vehicles (
          id,
          license_plate,
          make,
          model,
          color
        )
      `)
      .eq("customer_id", customer.id)
      .order("expected_arrival_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      count: bookings?.length || 0,
      bookings: bookings || [],
    });
  } catch (error) {
    console.error("Get customer bookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer bookings.",
    });
  }
};

const getCustomerBookingById = async (req, res) => {
  try {
    const customer = await getPortalCustomer(req);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found.",
      });
    }

    const { data: booking, error } = await supabase
      .from("parking_bookings")
      .select(`
        id,
        booking_code,
        parking_type,
        expected_arrival_at,
        status,
        contact_phone,
        notes,
        created_at,
        vehicle:vehicles (
          id,
          license_plate,
          make,
          model,
          color
        )
      `)
      .eq("id", req.params.id)
      .eq("customer_id", customer.id)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Get customer booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking.",
    });
  }
};

const cancelCustomerBooking = async (req, res) => {
  try {
    const customer = await getPortalCustomer(req);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found.",
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("parking_bookings")
      .select("*")
      .eq("id", req.params.id)
      .eq("customer_id", customer.id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (!["booked", "expected"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message:
          "This booking cannot be cancelled because it has already been processed.",
      });
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("parking_bookings")
      .update({
        status: "cancelled",
      })
      .eq("id", booking.id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({
        success: false,
        message: updateError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Parking pre-booking cancelled successfully.",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Cancel customer booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel parking booking.",
    });
  }
};

const getCustomerDashboard = async (req, res) => {
  try {
    const customer = await getPortalCustomer(req);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found.",
      });
    }

    const { data: vehicles, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, license_plate, make, model, color, created_at")
      .eq("customer_id", customer.id);

    if (vehicleError) throw vehicleError;

    const vehicleIds = (vehicles || []).map((vehicle) => vehicle.id);
    let activeSessions = [];

    if (vehicleIds.length) {
      const { data, error } = await supabase
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
          ),
          valet:employees (
            id,
            name,
            phone,
            email
          )
        `)
        .in("vehicle_id", vehicleIds)
        .in("status", [
          "checked_in",
          "parked",
          "retrieval_requested",
          "retrieving",
          "ready_for_pickup",
        ])
        .order("checked_in_at", { ascending: false });

      if (error) throw error;

      activeSessions = data || [];
    }

    return res.status(200).json({
      success: true,
      customer,
      vehicles: vehicles || [],
      active_sessions: activeSessions,
      current_session: activeSessions[0] || null,
    });
  } catch (error) {
    console.error("Get customer dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer dashboard.",
    });
  }
};

const getCustomerVehicles = async (req, res) => {
  try {
    const customer = await getPortalCustomer(req);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found.",
      });
    }

    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("id, license_plate, make, model, color, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const vehicleIds = (vehicles || []).map((vehicle) => vehicle.id);
    let sessions = [];

    if (vehicleIds.length) {
      const result = await supabase
        .from("parking_sessions")
        .select(
          "id, vehicle_id, ticket_code, parking_type, status, parking_slot, checked_in_at, parked_at, completed_at"
        )
        .in("vehicle_id", vehicleIds)
        .in("status", [
          "checked_in",
          "parked",
          "retrieval_requested",
          "retrieving",
          "ready_for_pickup",
        ])
        .order("checked_in_at", { ascending: false });

      if (result.error) throw result.error;

      sessions = result.data || [];
    }

    const result = (vehicles || []).map((vehicle) => ({
      ...vehicle,
      current_session:
        sessions.find((session) => session.vehicle_id === vehicle.id) || null,
    }));

    return res.status(200).json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
      count: result.length,
      vehicles: result,
    });
  } catch (error) {
    console.error("Get customer vehicles error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer vehicles.",
    });
  }
};

const getCustomerParkingHistory = async (req, res) => {
  try {
    const customer = await getPortalCustomer(req);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found.",
      });
    }

    const { data: vehicles, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("customer_id", customer.id);

    if (vehicleError) throw vehicleError;

    const vehicleIds = (vehicles || []).map((vehicle) => vehicle.id);

    if (!vehicleIds.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        history: [],
      });
    }

    const { data: history, error } = await supabase
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
        ),
        valet:employees (
          id,
          name,
          phone,
          email
        )
      `)
      .in("vehicle_id", vehicleIds)
      .eq("status", "returned_completed")
      .order("completed_at", { ascending: false });

    if (error) throw error;

    const result = (history || []).map((session) => {
      const duration =
        session.checked_in_at && session.completed_at
          ? Math.max(
              0,
              Math.round(
                (new Date(session.completed_at) -
                  new Date(session.checked_in_at)) /
                  60000
              )
            )
          : null;

      return {
        ...session,
        parking_duration:
          duration === null
            ? null
            : duration >= 60
              ? `${Math.floor(duration / 60)}h ${duration % 60}m`
              : `${duration}m`,
      };
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      history: result,
    });
  } catch (error) {
    console.error("Get customer parking history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer parking history.",
    });
  }
};

const updateCustomerRetrieval = async (req, res, nextStatus, message) => {
  const customer = await getPortalCustomer(req);

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer account not found.",
    });
  }

  const { data: session, error } = await supabase
    .from("parking_sessions")
    .select(`
      id,
      ticket_code,
      parking_type,
      status,
      parking_slot,
      vehicle:vehicles (
        id,
        customer_id,
        license_plate,
        make,
        model,
        color
      ),
      valet:employees (
        id,
        name,
        phone,
        email
      )
    `)
    .eq("id", req.params.id)
    .single();

  if (error || !session) {
    return res.status(404).json({
      success: false,
      message: "Parking session not found.",
    });
  }

  if (session.vehicle?.customer_id !== customer.id) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to modify this parking session.",
    });
  }

  const expectedStatus =
    nextStatus === "retrieval_requested"
      ? "parked"
      : "retrieval_requested";

  if (
    session.parking_type !== "valet" ||
    session.status !== expectedStatus
  ) {
    return res.status(400).json({
      success: false,
      message: `Retrieval action is unavailable from the current status: ${session.status}.`,
    });
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from("parking_sessions")
    .update({ status: nextStatus })
    .eq("id", session.id)
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
        customer_id,
        license_plate,
        make,
        model,
        color
      ),
      valet:employees (
        id,
        name,
        phone,
        email
      )
    `)
    .single();

  if (updateError) {
    return res.status(400).json({
      success: false,
      message: updateError.message,
    });
  }

  return res.status(200).json({
    success: true,
    message,
    session: updatedSession,
  });
};

const requestCustomerRetrieval = (req, res) =>
  updateCustomerRetrieval(
    req,
    res,
    "retrieval_requested",
    "Vehicle retrieval requested successfully."
  );

const cancelCustomerRetrieval = (req, res) =>
  updateCustomerRetrieval(
    req,
    res,
    "parked",
    "Vehicle retrieval request cancelled successfully."
  );

const getCustomerProfile = async (req, res) => {
  try {
    const customer = await getPortalCustomer(req);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get customer profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer profile.",
    });
  }
};

// ============================================================
// DELETE CUSTOMER
// ============================================================

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // 1. Find customer
    // --------------------------------------------------------

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, email")
      .eq("id", id)
      .maybeSingle();

    if (customerError) {
      console.error("Find customer before delete error:", customerError);

      return res.status(500).json({
        success: false,
        message: "Unable to verify customer."
      });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found."
      });
    }

    // --------------------------------------------------------
    // 2. Find customer's vehicles
    // --------------------------------------------------------

    const { data: vehicles, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, license_plate")
      .eq("customer_id", id);

    if (vehicleError) {
      console.error("Find customer vehicles error:", vehicleError);

      return res.status(500).json({
        success: false,
        message: "Unable to check customer's vehicles."
      });
    }

    const vehicleIds = (vehicles || []).map((vehicle) => vehicle.id);

    // --------------------------------------------------------
    // 3. Check active parking sessions
    // --------------------------------------------------------

    if (vehicleIds.length > 0) {
      const { data: activeSessions, error: sessionError } =
        await supabase
          .from("parking_sessions")
          .select("id, status, ticket_code, vehicle_id")
          .in("vehicle_id", vehicleIds)
          .in("status", [
            "checked_in",
            "parked",
            "retrieval_requested",
            "retrieving",
            "ready_for_pickup"
          ]);

      if (sessionError) {
        console.error(
          "Check active customer sessions error:",
          sessionError
        );

        return res.status(500).json({
          success: false,
          message: "Unable to verify customer's parking sessions."
        });
      }

      if (activeSessions && activeSessions.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            "Customer cannot be deleted because they have an active parking session.",
          active_sessions: activeSessions
        });
      }
    }

    // --------------------------------------------------------
    // 4. IMPORTANT:
    // Do not delete customer if vehicles/history exist.
    // --------------------------------------------------------

    if (vehicleIds.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Customer cannot be deleted because vehicles are associated with this customer. Remove or archive the associated records first."
      });
    }

    // --------------------------------------------------------
    // 5. Delete customer
    // --------------------------------------------------------

    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete customer error:", deleteError);

      return res.status(400).json({
        success: false,
        message: deleteError.message
      });
    }

    return res.status(200).json({
      success: true,
      message: `Customer "${customer.name}" deleted successfully.`,
      customer_id: id
    });

  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer."
    });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  deleteCustomer,
  getCustomerDashboard,
  getCustomerParkingHistory,
  requestCustomerRetrieval,
  getCustomerVehicles,
  cancelCustomerRetrieval,
  getCustomerProfile,
  createCustomerBooking,
  getCustomerBookings,
  getCustomerBookingById,
  cancelCustomerBooking,
};