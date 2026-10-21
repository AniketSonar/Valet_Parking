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

const createParkingBooking = async (req, res) => {
  try {
    const {
      customer_id,
      vehicle_id,
      parking_type,
      expected_arrival_at,
      contact_phone,
      notes
    } = req.body;

    if (
      !customer_id ||
      !vehicle_id ||
      !parking_type ||
      !expected_arrival_at
    ) {
      return res.status(400).json({
        success: false,
        message:
          "customer_id, vehicle_id, parking_type and expected_arrival_at are required."
      });
    }

    if (!["valet", "self"].includes(parking_type)) {
      return res.status(400).json({
        success: false,
        message: "parking_type must be either valet or self."
      });
    }

    const arrivalDate = new Date(expected_arrival_at);

    if (isNaN(arrivalDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid expected_arrival_at."
      });
    }

    if (arrivalDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expected arrival must be in the future."
      });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone, email")
      .eq("id", customer_id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found."
      });
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, customer_id, license_plate, make, model, color")
      .eq("id", vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found."
      });
    }

    if (vehicle.customer_id !== customer_id) {
      return res.status(400).json({
        success: false,
        message: "Vehicle does not belong to the selected customer."
      });
    }

    const bookingCode = await generateBookingCode();

    const { data: booking, error: bookingError } = await supabase
      .from("parking_bookings")
      .insert({
        customer_id,
        vehicle_id,
        parking_type,
        booking_code: bookingCode,
        expected_arrival_at: arrivalDate.toISOString(),
        status: "booked",
        contact_phone: contact_phone || customer.phone,
        notes: notes || null
      })
      .select()
      .single();

    if (bookingError) {
      return res.status(400).json({
        success: false,
        message: bookingError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Parking booking created successfully.",
      booking: {
        ...booking,
        customer,
        vehicle
      }
    });
  } catch (error) {
    console.error("Create parking booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getParkingBookings = async (req, res) => {
  try {
    const { status, parking_type, search } = req.query;

    let query = supabase
      .from("parking_bookings")
      .select(`
        *,
        customer:customers(id, name, phone, email),
        vehicle:vehicles(id, license_plate, make, model, color)
      `)
      .order("expected_arrival_at", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }

    if (parking_type) {
      query = query.eq("parking_type", parking_type);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    let filteredBookings = bookings || [];

    if (search) {
      const searchTerm = search.toLowerCase();

      filteredBookings = filteredBookings.filter((booking) =>
        booking.booking_code?.toLowerCase().includes(searchTerm) ||
        booking.customer?.name?.toLowerCase().includes(searchTerm) ||
        booking.customer?.phone?.toLowerCase().includes(searchTerm) ||
        booking.vehicle?.license_plate?.toLowerCase().includes(searchTerm)
      );
    }

    return res.status(200).json({
      success: true,
      count: filteredBookings.length,
      bookings: filteredBookings
    });
  } catch (error) {
    console.error("Get parking bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getParkingBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: booking, error } = await supabase
      .from("parking_bookings")
      .select(`
        *,
        customer:customers(id, name, phone, email),
        vehicle:vehicles(id, license_plate, make, model, color)
      `)
      .eq("id", id)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        message: "Parking booking not found."
      });
    }

    return res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error("Get parking booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const arriveParkingBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: booking, error: bookingError } = await supabase
      .from("parking_bookings")
      .select(`
        *,
        customer:customers(id, name, phone, email),
        vehicle:vehicles(id, customer_id, license_plate, make, model, color)
      `)
      .eq("id", id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        message: "Parking booking not found."
      });
    }

    if (booking.status !== "booked" && booking.status !== "expected") {
      return res.status(400).json({
        success: false,
        message: "This booking cannot be marked as arrived."
      });
    }

    const randomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const ticketCode = `VP-${randomCode}`;

    const { data: existingTicket } = await supabase
      .from("parking_sessions")
      .select("id")
      .eq("ticket_code", ticketCode)
      .maybeSingle();

    if (existingTicket) {
      return res.status(500).json({
        success: false,
        message: "Unable to generate a unique parking ticket. Please try again."
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .insert({
        vehicle_id: booking.vehicle_id,
        parking_type: booking.parking_type,
        ticket_code: ticketCode,
        booking_id: booking.id,
        status: "checked_in"
      })
      .select()
      .single();

    if (sessionError) {
      return res.status(400).json({
        success: false,
        message: sessionError.message
      });
    }

    const qrCode = await require("qrcode").toDataURL(ticketCode);
    const { error: notificationError } = await supabase
  .from("notifications")
  .insert({
    parking_session_id: session.id,
    recipient_type: "parking_admin",
    recipient_id: "28a1be26-a9ed-4cff-8aae-470ca3802d0b",
    message: `Pre-booked customer ${booking.customer.name} has arrived. Vehicle ${booking.vehicle.license_plate} is ready for valet parking.`,
    channel: "push",
    status: "pending"
  });

if (notificationError) {
  console.error("Create arrival notification error:", notificationError);
}

    const { data: updatedBooking, error: updateBookingError } =
      await supabase
        .from("parking_bookings")
        .update({
          status: "arrived"
        })
        .eq("id", booking.id)
        .select()
        .single();

    if (updateBookingError) {
      return res.status(400).json({
        success: false,
        message: updateBookingError.message
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer arrival recorded and parking session created successfully.",
      booking: updatedBooking,
      session,
      ticket: {
        ticket_code: ticketCode,
        qr_code: qrCode
      }
    });
  } catch (error) {
    console.error("Parking booking arrival error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

module.exports = {
  createParkingBooking,
  getParkingBookings,
  getParkingBookingById,
  arriveParkingBooking
};