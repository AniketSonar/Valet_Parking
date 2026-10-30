const supabase = require("../config/supabase");

const {
  notifyCustomerInBackground,
  notifySessionEventInBackground
} = require("../services/whatsappNotifier");
const { getAreaScope, floorInScope } = require("../utils/areaScope");
const { assignAvailableValet } = require("../utils/valetDispatch");
const QRCode = require("qrcode");
const crypto = require("crypto");

const ACTIVE_STATUSES = [
  "checked_in",
  "parked",
  "retrieval_requested",
  "retrieving",
  "ready_for_pickup"
];

const sendCheckInWhatsAppInBackground = ({
  customer,
  vehicle,
  session,
  parking_type,
  ticketCode,
  payment_method,
  paidAmount
}) => {
  notifyCustomerInBackground({
    event: "ticket",
    sessionId: session.id,
    customer,
    data: {
      plate: vehicle?.license_plate,
      parkingType: parking_type,
      ticketCode,
      location: session.parking_slot || null,
      paymentSummary: payment_method
        ? `${payment_method}${paidAmount != null ? ` Rs. ${paidAmount}` : ""}`
        : null
    }
  });
};

const getParkingSessions = async (req, res) => {
  try {
    const { search, status, parking_type } = req.query;

    let query = supabase
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
          color,
          customer:customers (
            id,
            name,
            phone,
            email
          )
        ),
        valet:employees (
          id,
          name,
          phone,
          role
        ),
        payment:payments (
          id,
          payment_status,
          payment_method,
          total_amount
        )
      `)
      .order("checked_in_at", { ascending: false });

    if (status) {

      const statuses = status.split(",").map((value) => value.trim()).filter(Boolean);


      query =
        statuses.length > 1
          ? query.in("status", statuses)
          : query.eq("status", statuses[0]);

    }

    if (parking_type) {
      query = query.eq("parking_type", parking_type);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error("Get parking sessions error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    let result = sessions || [];

    // Managers only see sessions parked inside the area assigned to them.
    if (req.user?.role === "manager") {
      const scope = await getAreaScope(req.user);

      const { data: slotRows } = await supabase
        .from("parking_slots")
        .select("slot_number, floor_id");

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

    if (search) {
      const searchTerm = search.toLowerCase();

      result = result.filter((session) => {
        const vehicleNumber =
          session.vehicle?.license_plate?.toLowerCase() || "";

        const customerName =
          session.vehicle?.customer?.name?.toLowerCase() || "";

        const customerPhone =
          session.vehicle?.customer?.phone?.toLowerCase() || "";

        const slot =
          session.parking_slot?.toLowerCase() || "";

        const ticket =
          session.ticket_code?.toLowerCase() || "";

        const valet =
          session.valet?.name?.toLowerCase() || "";

        return (
          vehicleNumber.includes(searchTerm) ||
          customerName.includes(searchTerm) ||
          customerPhone.includes(searchTerm) ||
          slot.includes(searchTerm) ||
          ticket.includes(searchTerm) ||
          valet.includes(searchTerm)
        );
      });
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      sessions: result
    });
  } catch (error) {
    console.error("Get parking sessions error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const PAYMENT_METHODS = ["cash", "online"];

const createParkingSession = async (req, res) => {
  try {
    const { vehicle_id, parking_type, payment_method, amount } = req.body;

    if (!vehicle_id || !parking_type) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID and parking type are required."
      });
    }

    if (!["valet", "self"].includes(parking_type)) {
      return res.status(400).json({
        success: false,
        message: "Parking type must be valet or self."
      });
    }

    // Payment is collected up-front, before the vehicle is checked in.
    if (!payment_method || !PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: "Payment mode must be cash or online."
      });
    }

    const paidAmount = Number(amount);

    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid amount greater than zero is required."
      });
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select(`
        id,
        license_plate,
        make,
        model,
        color,
        customer_id,
        customer:customers (
          id,
          name,
          phone,
          email
        )
      `)
      .eq("id", vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found."
      });
    }

    const { data: existingSessions, error: existingSessionError } =
      await supabase
        .from("parking_sessions")
        .select(`
          id,
          ticket_code,
          status,
          parking_slot
        `)
        .eq("vehicle_id", vehicle_id)
        .in("status", ACTIVE_STATUSES)
        .order("checked_in_at", { ascending: false });

    if (existingSessionError) {
      console.error(
        "Check existing parking session error:",
        existingSessionError
      );

      return res.status(500).json({
        success: false,
        message: existingSessionError.message
      });
    }

    if (existingSessions && existingSessions.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Vehicle is already checked in.",
        session: existingSessions[0]
      });
    }

    let ticketCode;
    let ticketExists = true;

    while (ticketExists) {
      const randomCode = crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase();

      ticketCode = `VP-${randomCode}`;

      const {
        data: existingTicket,
        error: ticketCheckError
      } = await supabase
        .from("parking_sessions")
        .select("id")
        .eq("ticket_code", ticketCode)
        .maybeSingle();

      if (ticketCheckError) {
        return res.status(500).json({
          success: false,
          message: ticketCheckError.message
        });
      }

      ticketExists = !!existingTicket;
    }

    const qrCode = await QRCode.toDataURL(ticketCode);

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .insert([
        {
          vehicle_id,
          parking_type,
          ticket_code: ticketCode,
          status: "checked_in"
        }
      ])
      .select()
      .single();

    if (sessionError) {
      console.error("Create parking session error:", sessionError);

      return res.status(400).json({
        success: false,
        message: sessionError.message
      });
    }

    if (parking_type === "valet") {
      const { data: existingKey, error: keyCheckError } = await supabase
        .from("keys")
        .select("id")
        .eq("parking_session_id", session.id)
        .maybeSingle();

      if (keyCheckError) {
        console.error("Check parking session key error:", keyCheckError);

        return res.status(500).json({
          success: false,
          message: keyCheckError.message
        });
      }

      if (!existingKey) {
        const { error: keyError } = await supabase
          .from("keys")
          .insert([
            {
              key_number: `KEY-${ticketCode}`,
              parking_session_id: session.id,
              status: "stored",
              notes: "Vehicle key received during check-in."
            }
          ]);

        if (keyError) {
          console.error("Create parking session key error:", keyError);

          return res.status(400).json({
            success: false,
            message: keyError.message
          });
        }
      }
    }

    // Record the prepaid payment. If it fails, roll back the session so a
    // vehicle is never checked in without a recorded payment.
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        parking_session_id: session.id,
        parking_charge: paidAmount,
        valet_service_charge: 0,
        extra_charges: 0,
        discount: 0,
        gst: 0,
        total_amount: paidAmount,
        payment_method,
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        invoice_number: `INV-${Date.now()}`
      })
      .select("*")
      .single();

    if (paymentError) {
      console.error("Check-in payment error:", paymentError);

      await supabase
        .from("keys")
        .delete()
        .eq("parking_session_id", session.id);

      await supabase
        .from("parking_sessions")
        .delete()
        .eq("id", session.id);

      return res.status(500).json({
        success: false,
        message: "Payment could not be recorded, so check-in was cancelled."
      });
    }

    // Valet parking: hand the car and its key to whichever valet is free now,
    // so there is no separate key-management / assign-valet step.
    const dispatch =
      parking_type === "valet"
        ? await assignAvailableValet(session, req.user)
        : null;

    if (dispatch?.assigned) {
      session.valet_id = dispatch.valet.id;
    }

    const customer = vehicle.customer;
    sendCheckInWhatsAppInBackground({
      customer,
      vehicle,
      session,
      parking_type,
      ticketCode,
      payment_method,
      paidAmount
    });

    return res.status(201).json({
      success: true,
      message: dispatch?.assigned
        ? `Parking session created. ${dispatch.valet.name} is assigned to this vehicle.`
        : "Parking session created successfully.",
      session,
      payment,
      valet: dispatch?.assigned ? dispatch.valet : null,
      valet_assignment: dispatch,
      ticket: {
        ticket_code: ticketCode,
        qr_code: qrCode
      },
      whatsapp: {
        queued: false,
        sent: false,
        manual: true,
        error: null
      }
    });
  } catch (error) {
    console.error("Create parking session error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const quickCheckIn = async (req, res) => {
  try {
    const {
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      vehicle_id,
      license_plate,
      make,
      model,
      color,
      parking_type = "valet"
    } = req.body;

    if (!parking_type || !["valet", "self"].includes(parking_type)) {
      return res.status(400).json({
        success: false,
        message: "Parking type must be valet or self."
      });
    }

    let customer;

    if (customer_id) {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("id", customer_id)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          message: "Customer not found."
        });
      }

      customer = data;
    } else {
      if (!customer_name || !customer_phone) {
        return res.status(400).json({
          success: false,
          message: "Customer name and phone number are required."
        });
      }

      const normalizedPhone = customer_phone.trim();

      const { data: existingCustomer, error: customerSearchError } =
        await supabase
          .from("customers")
          .select("id, name, phone, email")
          .eq("phone", normalizedPhone)
          .maybeSingle();

      if (customerSearchError) {
        return res.status(500).json({
          success: false,
          message: customerSearchError.message
        });
      }

      if (existingCustomer) {
        customer = existingCustomer;
      } else {
        const { data: newCustomer, error: customerCreateError } =
          await supabase
            .from("customers")
            .insert([
              {
                name: customer_name.trim(),
                phone: normalizedPhone,
                email: customer_email?.trim() || null
              }
            ])
            .select("id, name, phone, email")
            .single();

        if (customerCreateError) {
          return res.status(400).json({
            success: false,
            message: customerCreateError.message
          });
        }

        customer = newCustomer;
      }
    }

    let vehicle;

    if (vehicle_id) {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          id,
          license_plate,
          make,
          model,
          color,
          customer_id
        `)
        .eq("id", vehicle_id)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found."
        });
      }

      if (data.customer_id !== customer.id) {
        return res.status(400).json({
          success: false,
          message: "Vehicle does not belong to the selected customer."
        });
      }

      vehicle = data;
    } else {
      if (!license_plate) {
        return res.status(400).json({
          success: false,
          message: "License plate is required."
        });
      }

      const normalizedPlate = license_plate.trim().toUpperCase();

      const { data: existingVehicle, error: vehicleSearchError } =
        await supabase
          .from("vehicles")
          .select(`
            id,
            license_plate,
            make,
            model,
            color,
            customer_id
          `)
          .eq("license_plate", normalizedPlate)
          .maybeSingle();

      if (vehicleSearchError) {
        return res.status(500).json({
          success: false,
          message: vehicleSearchError.message
        });
      }

      if (existingVehicle) {
        if (existingVehicle.customer_id !== customer.id) {
          return res.status(409).json({
            success: false,
            message: "This vehicle is already registered to another customer."
          });
        }

        vehicle = existingVehicle;
      } else {
        const { data: newVehicle, error: vehicleCreateError } =
          await supabase
            .from("vehicles")
            .insert([
              {
                customer_id: customer.id,
                license_plate: normalizedPlate,
                make: make?.trim() || null,
                model: model?.trim() || null,
                color: color?.trim() || null
              }
            ])
            .select(`
              id,
              license_plate,
              make,
              model,
              color,
              customer_id
            `)
            .single();

        if (vehicleCreateError) {
          return res.status(400).json({
            success: false,
            message: vehicleCreateError.message
          });
        }

        vehicle = newVehicle;
      }
    }

    const { data: existingSessions, error: existingSessionError } =
      await supabase
        .from("parking_sessions")
        .select(`
          id,
          ticket_code,
          status,
          parking_slot
        `)
        .eq("vehicle_id", vehicle.id)
        .in("status", ACTIVE_STATUSES)
        .order("checked_in_at", { ascending: false });

    if (existingSessionError) {
      return res.status(500).json({
        success: false,
        message: existingSessionError.message
      });
    }

    if (existingSessions?.length) {
      return res.status(400).json({
        success: false,
        message: "Vehicle is already checked in.",
        session: existingSessions[0]
      });
    }

    let ticketCode;
    let ticketExists = true;

    while (ticketExists) {
      const randomCode = crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase();

      ticketCode = `VP-${randomCode}`;

      const { data: existingTicket, error: ticketCheckError } =
        await supabase
          .from("parking_sessions")
          .select("id")
          .eq("ticket_code", ticketCode)
          .maybeSingle();

      if (ticketCheckError) {
        return res.status(500).json({
          success: false,
          message: ticketCheckError.message
        });
      }

      ticketExists = !!existingTicket;
    }

    const qrCode = await QRCode.toDataURL(ticketCode);

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .insert([
        {
          vehicle_id: vehicle.id,
          parking_type,
          ticket_code: ticketCode,
          status: "checked_in"
        }
      ])
      .select()
      .single();

    if (sessionError) {
      return res.status(400).json({
        success: false,
        message: sessionError.message
      });
    }

    if (parking_type === "valet") {
      const { error: keyError } = await supabase
        .from("keys")
        .insert([
          {
            key_number: `KEY-${ticketCode}`,
            parking_session_id: session.id,
            status: "stored",
            notes: "Vehicle key received during check-in."
          }
        ]);

      if (keyError) {
        console.error("Create parking session key error:", keyError);
      }
    }

    const dispatch =
      parking_type === "valet"
        ? await assignAvailableValet(session, req.user)
        : null;

    if (dispatch?.assigned) {
      session.valet_id = dispatch.valet.id;
    }

    sendCheckInWhatsAppInBackground({
      customer,
      vehicle,
      session,
      parking_type,
      ticketCode
    });

    return res.status(201).json({
      success: true,
      message: dispatch?.assigned
        ? `Vehicle checked in. ${dispatch.valet.name} is assigned to this vehicle.`
        : "Vehicle checked in successfully.",
      customer,
      vehicle,
      session,
      valet: dispatch?.assigned ? dispatch.valet : null,
      valet_assignment: dispatch,
      ticket: {
        ticket_code: ticketCode,
        qr_code: qrCode
      },
      whatsapp: {
        queued: false,
        sent: false,
        manual: true,
        error: null
      }
    });
  } catch (error) {
    console.error("Quick check-in error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete vehicle check-in."
    });
  }
};
const assignParkingSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { parking_position_id, parking_slot } = req.body;

    const requestedSlot =
      parking_slot !== undefined && parking_slot !== null
        ? String(parking_slot).trim()
        : "";

    if (!parking_position_id && !requestedSlot) {
      return res.status(400).json({
        success: false,
        message: "Parking position or parking slot is required."
      });
    }

    const POSITION_SELECT = `
      id,
      system_id,
      position_code,
      position_name,
      position_type,
      status,
      parking_systems (
        id,
        system_name,
        system_type,
        floor_id
      )
    `;

    let position = null;
    let legacySlot = null;

    if (parking_position_id) {
      const { data, error: positionError } = await supabase
        .from("parking_positions")
        .select(POSITION_SELECT)
        .eq("id", parking_position_id)
        .single();

      if (positionError || !data) {
        return res.status(404).json({
          success: false,
          message: "Parking position not found."
        });
      }

      position = data;
    } else {
      const { data: byCode, error: byCodeError } = await supabase
        .from("parking_positions")
        .select(POSITION_SELECT)
        .ilike("position_code", requestedSlot)
        .limit(1)
        .maybeSingle();

      if (byCodeError) {
        console.error("Find parking position by code error:", byCodeError);

        return res.status(500).json({
          success: false,
          message: "Unable to look up the parking position."
        });
      }

      position = byCode || null;
    }

    if (position) {
      if (position.status !== "available") {
        return res.status(400).json({
          success: false,
          message: "Parking position is not available."
        });
      }
    } else {
      const { data: slotRow, error: slotLookupError } = await supabase
        .from("parking_slots")
        .select("id, slot_number, status, floor_id")
        .eq("slot_number", requestedSlot)
        .maybeSingle();

      if (slotLookupError) {
        console.error("Find parking slot error:", slotLookupError);

        return res.status(500).json({
          success: false,
          message: "Unable to look up the parking slot."
        });
      }

      if (!slotRow) {
        return res.status(404).json({
          success: false,
          message: "Parking slot not found."
        });
      }

      if (slotRow.status !== "available") {
        return res.status(400).json({
          success: false,
          message: "Parking slot is not available."
        });
      }

      legacySlot = slotRow;
    }

    if (req.user?.role === "manager") {
      const scope = await getAreaScope(req.user);
      const targetFloorId = position
        ? position.parking_systems?.floor_id
        : legacySlot.floor_id;

      if (!floorInScope(scope, targetFloorId)) {
        return res.status(403).json({
          success: false,
          message: "This slot is outside the area assigned to you."
        });
      }
    }

    const assignedSlotCode = position
      ? position.position_code
      : legacySlot.slot_number;

    const { data: existingSession, error: sessionFindError } =
      await supabase
        .from("parking_sessions")
        .select("id, vehicle_id, status, valet_id, parking_type")
        .eq("id", id)
        .single();

    if (sessionFindError || !existingSession) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (existingSession.status !== "checked_in") {
      return res.status(400).json({
        success: false,
        message: "Only checked-in sessions can be assigned a parking position."
      });
    }

    if (existingSession.parking_type === "valet") {
      const { data: initialInspection, error: inspectionError } =
        await supabase
          .from("vehicle_inspections")
          .select("id, inspection_stage, condition_status")
          .eq("session_id", id)
          .eq("inspection_stage", "initial")
          .maybeSingle();

      if (inspectionError) {
        console.warn("Initial inspection lookup warning:", inspectionError);
      }

      if (!initialInspection) {
        try {
          await supabase
            .from("vehicle_inspections")
            .insert([
              {
                session_id: id,
                vehicle_id: existingSession.vehicle_id,
                inspection_stage: "initial",
                condition_status: "good",
                inspected_by: req.user?.id || null,
                inspected_at: new Date().toISOString(),
                inspection_notes: "Initial inspection recorded upon parking slot assignment."
              }
            ]);
        } catch (autoInspErr) {
          console.warn("Auto-create initial inspection warning:", autoInspErr);
        }
      }
    }

    if (req.user?.role === "valet" || req.user?.role === "valet_attendant") {
      if (!existingSession.valet_id) {
        const { data: valetEmp } = await supabase
          .from("employees")
          .select("id")
          .eq("email", req.user.email)
          .maybeSingle();

        if (valetEmp) {
          existingSession.valet_id = valetEmp.id;
          await supabase
            .from("parking_sessions")
            .update({ valet_id: valetEmp.id })
            .eq("id", id);
        }
      }
    }

    const { data: session, error: sessionError } =
      await supabase
        .from("parking_sessions")
        .update({
          parking_position_id: position ? position.id : null,
          parking_slot: assignedSlotCode,
          status: "parked",
          parked_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("status", "checked_in")
        .select()
        .single();

    if (sessionError || !session) {
      console.error(
        "Update parking session error:",
        sessionError
      );

      return res.status(400).json({
        success: false,
        message:
          sessionError?.message ||
          "Failed to update parking session."
      });
    }

    let positionUpdateError = null;

    if (position) {
      const result = await supabase
        .from("parking_positions")
        .update({
          status: "occupied"
        })
        .eq("id", position.id)
        .eq("status", "available");

      positionUpdateError = result.error;
    } else {
      const { data: claimedSlot, error: claimError } = await supabase
        .from("parking_slots")
        .update({
          status: "occupied"
        })
        .eq("id", legacySlot.id)
        .eq("status", "available")
        .select("id")
        .maybeSingle();

      positionUpdateError =
        claimError ||
        (!claimedSlot
          ? { message: "Parking slot is no longer available." }
          : null);
    }

    if (positionUpdateError) {
      console.error(
        "Update parking position error:",
        positionUpdateError
      );

      await supabase
        .from("parking_sessions")
        .update({
          parking_position_id: null,
          parking_slot: null,
          status: "checked_in",
          parked_at: null
        })
        .eq("id", id);

      return res.status(400).json({
        success: false,
        message: positionUpdateError.message
      });
    }

    if (position) {
      const { error: legacySlotError } = await supabase
        .from("parking_slots")
        .update({
          status: "occupied"
        })
        .eq("slot_number", position.position_code);

      if (legacySlotError) {
        console.error(
          "Update legacy parking slot error:",
          legacySlotError
        );
      }
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("customer_id")
      .eq("id", session.vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      console.error(
        "Get vehicle customer error:",
        vehicleError
      );
    } else {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert([
          {
            parking_session_id: session.id,
            recipient_type: "customer",
            recipient_id: vehicle.customer_id,
            message:
              `Your vehicle has been parked successfully in slot ${assignedSlotCode}.`,
            channel: "in_app",
            status: "sent",
            sent_at: new Date().toISOString()
          }
        ]);

      if (notificationError) {
        console.error(
          "Vehicle parked notification error:",
          notificationError
        );
      }

      notifySessionEventInBackground({
        event: "parked",
        sessionId: session.id,
        data: {
          location: [
            position?.position_name || assignedSlotCode,
            position?.parking_systems?.system_name
          ]
            .filter(Boolean)
            .join(" - ")
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Parking slot assigned successfully.",
      session,
      position: position
        ? {
            id: position.id,
            position_code: position.position_code,
            position_name: position.position_name,
            position_type: position.position_type,
            system: position.parking_systems
          }
        : {
            id: null,
            position_code: assignedSlotCode,
            position_name: assignedSlotCode,
            position_type: "standard",
            system: null
          }
    });
  } catch (error) {
    console.error(
      "Assign parking position error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const assignValet = async (req, res) => {
  try {
    const { id } = req.params;
    const { valet_id } = req.body;

    if (!valet_id) {
      return res.status(400).json({
        success: false,
        message: "Valet ID is required."
      });
    }

    const { data: valet, error: valetError } = await supabase
      .from("employees")
      .select("id, name, phone, role, email, is_active")
      .eq("id", valet_id)
      .eq("role", "valet")
      .single();

    if (valetError || !valet) {
      return res.status(404).json({
        success: false,
        message: "Valet not found."
      });
    }

    if (!valet.is_active) {
      return res.status(400).json({
        success: false,
        message: "Valet is inactive."
      });
    }

    if (req.user?.role === "manager") {
      const scope = await getAreaScope(req.user);

      const { data: post } = await supabase
        .from("valet_assignments")
        .select("floor_id")
        .eq("valet_id", valet_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!post || !floorInScope(scope, post.floor_id)) {
        return res.status(403).json({
          success: false,
          message: "This valet is not posted in your area. Assign them to a post first."
        });
      }
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("email", valet.email)
      .eq("role", "valet")
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "Valet user account not found."
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .select("id, status, parking_type, valet_id, ticket_code")
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (session.parking_type !== "valet") {
      return res.status(400).json({
        success: false,
        message: "Valet can only be assigned to valet parking sessions."
      });
    }

    let { data: key, error: keyError } = await supabase
      .from("keys")
      .select("id, status, parking_session_id, assigned_to")
      .eq("parking_session_id", id)
      .maybeSingle();

    if (keyError) {
      console.error("Find parking session key error:", keyError);

      return res.status(500).json({
        success: false,
        message: "Unable to verify vehicle key."
      });
    }

    if (!key && !keyError) {
      const { data: createdKey, error: createKeyError } = await supabase
        .from("keys")
        .insert([
          {
            key_number: `KEY-${session.ticket_code || id}`,
            parking_session_id: id,
            status: "stored",
            notes: "Key record created automatically during valet assignment."
          }
        ])
        .select("id, status, parking_session_id, assigned_to")
        .single();

      if (createKeyError || !createdKey) {
        console.error("Auto-create key error:", createKeyError);

        return res.status(400).json({
          success: false,
          message:
            createKeyError?.message ||
            "Vehicle key record not found for this parking session."
        });
      }

      key = createdKey;
    }

    if (key.status === "assigned" && key.assigned_to === user.id) {
      const { data: sameSession, error: sameSessionError } = await supabase
        .from("parking_sessions")
        .update({ valet_id })
        .eq("id", id)
        .select()
        .single();

      if (sameSessionError || !sameSession) {
        return res.status(400).json({
          success: false,
          message: sameSessionError?.message || "Unable to assign valet."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Valet assigned successfully and key assigned to valet.",
        session: sameSession,
        key
      });
    }

    if (key.status === "lost") {
      return res.status(400).json({
        success: false,
        message: "Vehicle key is marked as lost."
      });
    }

    // "assigned" is allowed so a manager can reassign a car that was auto-assigned
    // to another valet at check-in; the key moves to the new valet below.
    if (!["stored", "available", "returned", "assigned"].includes(key.status)) {
      return res.status(400).json({
        success: false,
        message: "Vehicle key is not available for valet assignment."
      });
    }

    const { data: updatedSession, error: sessionUpdateError } =
      await supabase
        .from("parking_sessions")
        .update({
          valet_id
        })
        .eq("id", id)
        .select()
        .single();

    if (sessionUpdateError || !updatedSession) {
      return res.status(400).json({
        success: false,
        message:
          sessionUpdateError?.message || "Unable to assign valet."
      });
    }

    const { data: updatedKey, error: keyUpdateError } = await supabase
      .from("keys")
      .update({
        assigned_to: user.id,
        status: "assigned",
        assigned_at: new Date().toISOString(),
        returned_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", key.id)
      .eq("parking_session_id", id)
      .select()
      .single();

    if (keyUpdateError || !updatedKey) {
      await supabase
        .from("parking_sessions")
        .update({
          valet_id: session.valet_id || null
        })
        .eq("id", id);

      return res.status(400).json({
        success: false,
        message:
          keyUpdateError?.message || "Unable to assign vehicle key to valet."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Valet assigned successfully and key assigned to valet.",
      session: updatedSession,
      key: updatedKey
    });
  } catch (error) {
    console.error("Assign valet error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const requestRetrieval = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .select("id, status, parking_slot")
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (session.status !== "parked") {
      return res.status(400).json({
        success: false,
        message: "Only parked vehicles can be requested for retrieval."
      });
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from("parking_sessions")
      .update({
        status: "retrieval_requested"
      })
      .eq("id", id)
      .eq("status", "parked")
      .select()
      .maybeSingle();

    if (updateError) {
      return res.status(400).json({
        success: false,
        message: updateError.message
      });
    }

    if (!updatedSession) {
      return res.status(409).json({
        success: false,
        message: "Vehicle retrieval request could not be completed because the session status changed."
      });
    }

    notifySessionEventInBackground({
      event: "retrieval_requested",
      sessionId: updatedSession.id
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle retrieval requested successfully.",
      session: updatedSession
    });
  } catch (error) {
    console.error("Request retrieval error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const startRetrieval = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .select(`
        id,
        status,
        parking_slot,
        vehicle_id,
        valet_id
      `)
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (session.status !== "retrieval_requested") {
      return res.status(400).json({
        success: false,
        message: "Vehicle must have a retrieval request first."
      });
    }

    if (!session.valet_id) {
      return res.status(400).json({
        success: false,
        message: "No valet is assigned to this parking session."
      });
    }

    const { data: key, error: keyFetchError } = await supabase
      .from("keys")
      .select("id, status, assigned_to, parking_session_id")
      .eq("parking_session_id", id)
      .maybeSingle();

    if (keyFetchError) {
      console.error(
        "Find parking session key error:",
        keyFetchError
      );

      return res.status(500).json({
        success: false,
        message: "Unable to verify vehicle key."
      });
    }

    if (!key) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle key record not found for this parking session."
      });
    }

    if (key.status === "lost") {
      return res.status(400).json({
        success: false,
        message: "Vehicle key is marked as lost."
      });
    }

    if (
      !["assigned", "stored", "available", "returned"].includes(
        key.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle key must be assigned to a valet before retrieval."
      });
    }

    if (!key.assigned_to) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle key is not assigned to a valid valet."
      });
    }

    if (req.user?.role === "valet") {
      if (key.assigned_to !== req.user.id) {
        return res.status(403).json({
          success: false,
          message:
            "You are not the valet assigned to this vehicle."
        });
      }

      const { data: assignedValet, error: assignedValetError } =
        await supabase
          .from("employees")
          .select("id, email, role, is_active")
          .eq("id", session.valet_id)
          .eq("role", "valet")
          .single();

      if (assignedValetError || !assignedValet) {
        return res.status(404).json({
          success: false,
          message: "Assigned valet employee record not found."
        });
      }

      if (!assignedValet.is_active) {
        return res.status(400).json({
          success: false,
          message: "Assigned valet is inactive."
        });
      }

      const { data: valetUser, error: valetUserError } =
        await supabase
          .from("users")
          .select("id, email, role, is_active")
          .eq("id", req.user.id)
          .eq("role", "valet")
          .single();

      if (valetUserError || !valetUser) {
        return res.status(404).json({
          success: false,
          message: "Valet user account not found."
        });
      }

      if (!valetUser.is_active) {
        return res.status(400).json({
          success: false,
          message: "Your valet account is inactive."
        });
      }

      if (valetUser.email !== assignedValet.email) {
        return res.status(403).json({
          success: false,
          message:
            "You are not the valet assigned to this vehicle."
        });
      }
    }

    const { data: updatedKey, error: keyUpdateError } =
      await supabase
        .from("keys")
        .update({
          status: "in_use",
          updated_at: new Date().toISOString()
        })
        .eq("id", key.id)
        .in("status", [
          "assigned",
          "stored",
          "available",
          "returned"
        ])
        .eq("assigned_to", key.assigned_to)
        .select()
        .single();

    if (keyUpdateError || !updatedKey) {
      return res.status(400).json({
        success: false,
        message:
          keyUpdateError?.message ||
          "Unable to start vehicle key retrieval."
      });
    }

    const {
      data: updatedSession,
      error: sessionUpdateError
    } = await supabase
      .from("parking_sessions")
      .update({
        status: "retrieving"
      })
      .eq("id", id)
      .eq("status", "retrieval_requested")
      .select()
      .single();

    if (sessionUpdateError || !updatedSession) {
      await supabase
        .from("keys")
        .update({
          status: "assigned",
          updated_at: new Date().toISOString()
        })
        .eq("id", key.id)
        .eq("status", "in_use");

      return res.status(400).json({
        success: false,
        message:
          sessionUpdateError?.message ||
          "Unable to start vehicle retrieval."
      });
    }

    const { data: vehicle, error: vehicleError } =
      await supabase
        .from("vehicles")
        .select("customer_id")
        .eq("id", updatedSession.vehicle_id)
        .single();

    if (vehicleError || !vehicle) {
      console.error(
        "Get vehicle customer error:",
        vehicleError
      );
    } else {
      const { error: notificationError } =
        await supabase
          .from("notifications")
          .insert([
            {
              parking_session_id: updatedSession.id,
              recipient_type: "customer",
              recipient_id: vehicle.customer_id,
              message: "Your vehicle retrieval has started.",
              channel: "in_app",
              status: "sent",
              sent_at: new Date().toISOString()
            }
          ]);

      if (notificationError) {
        console.error(
          "Retrieval started notification error:",
          notificationError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Vehicle retrieval started and key is now in use.",
      session: updatedSession,
      key: updatedKey
    });
  } catch (error) {
    console.error("Start retrieval error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const markReadyForPickup = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .select("id, status, vehicle_id")
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (session.status !== "retrieving") {
      return res.status(400).json({
        success: false,
        message: "Vehicle must be in retrieving state."
      });
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from("parking_sessions")
      .update({
        status: "ready_for_pickup"
      })
      .eq("id", id)
      .eq("status", "retrieving")
      .select()
      .maybeSingle();

    if (updateError) {
      return res.status(400).json({
        success: false,
        message: updateError.message
      });
    }

    if (!updatedSession) {
      return res.status(409).json({
        success: false,
        message: "Vehicle could not be marked ready because the session status changed."
      });
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("customer_id")
      .eq("id", session.vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      console.error("Get vehicle customer error:", vehicleError);
    } else {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert([
          {
            parking_session_id: updatedSession.id,
            recipient_type: "customer",
            recipient_id: vehicle.customer_id,
            message: "Your vehicle is ready for pickup.",
            channel: "in_app",
            status: "sent",
            sent_at: new Date().toISOString()
          }
        ]);

      if (notificationError) {
        console.error(
          "Ready for pickup notification error:",
          notificationError
        );
      }
    }

    notifySessionEventInBackground({
      event: "ready_for_pickup",
      sessionId: updatedSession.id
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle is ready for pickup.",
      session: updatedSession
    });
  } catch (error) {
    console.error("Ready for pickup error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const completeReturn = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .select(`
        id,
        status,
        parking_slot,
        parking_position_id,
        ticket_code,
        completed_at,
        valet_id,
        vehicle:vehicles (
          id,
          customer_id,
          license_plate,
          make,
          model,
          customer:customers (
            id,
            name,
            phone,
            email
          )
        )
      `)
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (session.status !== "ready_for_pickup") {
      return res.status(400).json({
        success: false,
        message: "Vehicle must be ready for pickup before completing return."
      });
    }

    if (req.user.role === "valet") {
      if (!session.valet_id) {
        return res.status(400).json({
          success: false,
          message: "No valet is assigned to this parking session."
        });
      }

      const { data: assignedValet, error: assignedValetError } =
        await supabase
          .from("employees")
          .select("id, email")
          .eq("id", session.valet_id)
          .eq("role", "valet")
          .single();

      if (assignedValetError || !assignedValet) {
        return res.status(400).json({
          success: false,
          message: "Assigned valet could not be verified."
        });
      }

      if (!assignedValet.email) {
        return res.status(400).json({
          success: false,
          message: "Assigned valet does not have a valid email."
        });
      }

      const { data: assignedUser, error: assignedUserError } =
        await supabase
          .from("users")
          .select("id")
          .eq("email", assignedValet.email)
          .eq("role", "valet")
          .single();

      if (assignedUserError || !assignedUser) {
        return res.status(400).json({
          success: false,
          message: "Assigned valet user could not be verified."
        });
      }

      if (assignedUser.id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this vehicle."
        });
      }
    }

    const { data: finalInspection, error: inspectionError } =
      await supabase
        .from("vehicle_inspections")
        .select("id, inspection_stage, condition_status")
        .eq("session_id", id)
        .eq("inspection_stage", "final")
        .maybeSingle();

    if (inspectionError) {
      console.error("Final inspection lookup error:", inspectionError);

      return res.status(500).json({
        success: false,
        message: "Unable to verify final vehicle inspection."
      });
    }

    if (!finalInspection) {
      return res.status(400).json({
        success: false,
        message: "Final vehicle inspection is required before completing return."
      });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, payment_status, total_amount")
      .eq("parking_session_id", id)
      .maybeSingle();

    if (paymentError) {
      console.error("Payment lookup error:", paymentError);

      return res.status(500).json({
        success: false,
        message: "Unable to verify payment."
      });
    }

    if (!payment) {
      return res.status(400).json({
        success: false,
        message: "Payment is required before completing return."
      });
    }

    if (payment.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment must be completed before returning the vehicle."
      });
    }

    const { data: key, error: keyFetchError } = await supabase
      .from("keys")
      .select("id, status, assigned_to, returned_at")
      .eq("parking_session_id", id)
      .maybeSingle();

    if (keyFetchError) {
      console.error("Fetch parking session key error:", keyFetchError);

      return res.status(500).json({
        success: false,
        message: "Unable to verify vehicle key."
      });
    }

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Vehicle key record not found for this parking session."
      });
    }

    if (key.status === "lost") {
      return res.status(400).json({
        success: false,
        message: "Vehicle key is marked as lost and return cannot be completed."
      });
    }

    if (key.status !== "in_use") {
      return res.status(400).json({
        success: false,
        message: "Vehicle key has not completed the required retrieval lifecycle."
      });
    }

    if (!key.assigned_to) {
      return res.status(400).json({
        success: false,
        message: "Vehicle key is not assigned to a valet."
      });
    }

    if (req.user.role === "valet" && key.assigned_to !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this vehicle key."
      });
    }

    const completedAt = new Date().toISOString();

    let positionUpdated = false;
    let slotUpdated = false;
    let keyUpdated = false;

    if (session.parking_position_id) {
      const { data: updatedPosition, error: positionError } =
        await supabase
          .from("parking_positions")
          .update({
            status: "available"
          })
          .eq("id", session.parking_position_id)
          .eq("status", "occupied")
          .select("id")
          .maybeSingle();

      if (positionError) {
        console.error("Free parking position error:", positionError);

        return res.status(400).json({
          success: false,
          message: "Unable to release parking position."
        });
      }

      if (!updatedPosition) {
        return res.status(409).json({
          success: false,
          message: "Parking position is no longer occupied or has already been released."
        });
      }

      positionUpdated = true;
    }

    if (session.parking_slot) {
      const { data: updatedSlot, error: slotError } = await supabase
        .from("parking_slots")
        .update({
          status: "available"
        })
        .eq("slot_number", session.parking_slot)
        .eq("status", "occupied")
        .select("slot_number")
        .maybeSingle();

      if (slotError) {
        console.error("Free parking slot error:", slotError);

        if (positionUpdated && session.parking_position_id) {
          await supabase
            .from("parking_positions")
            .update({
              status: "occupied"
            })
            .eq("id", session.parking_position_id);
        }

        return res.status(400).json({
          success: false,
          message: "Unable to release parking slot."
        });
      }

      if (!updatedSlot) {
        if (positionUpdated && session.parking_position_id) {
          await supabase
            .from("parking_positions")
            .update({
              status: "occupied"
            })
            .eq("id", session.parking_position_id);
        }

        return res.status(409).json({
          success: false,
          message: "Parking slot is no longer occupied or has already been released."
        });
      }

      slotUpdated = true;
    }

    const { data: updatedKey, error: keyUpdateError } = await supabase
      .from("keys")
      .update({
        status: "returned",
        assigned_to: null,
        returned_at: completedAt,
        updated_at: completedAt
      })
      .eq("id", key.id)
      .eq("status", "in_use")
      .select()
      .maybeSingle();

    if (keyUpdateError || !updatedKey) {
      if (positionUpdated && session.parking_position_id) {
        await supabase
          .from("parking_positions")
          .update({
            status: "occupied"
          })
          .eq("id", session.parking_position_id);
      }

      if (slotUpdated && session.parking_slot) {
        await supabase
          .from("parking_slots")
          .update({
            status: "occupied"
          })
          .eq("slot_number", session.parking_slot);
      }

      console.error("Update returned key error:", keyUpdateError);

      return res.status(400).json({
        success: false,
        message:
          keyUpdateError?.message ||
          "Unable to complete key return."
      });
    }

    keyUpdated = true;

    const {
      data: updatedSession,
      error: updateSessionError
    } = await supabase
      .from("parking_sessions")
      .update({
        status: "returned_completed",
        completed_at: completedAt
      })
      .eq("id", id)
      .eq("status", "ready_for_pickup")
      .select()
      .maybeSingle();

    if (updateSessionError || !updatedSession) {
      if (keyUpdated) {
        await supabase
          .from("keys")
          .update({
            status: "in_use",
            assigned_to: key.assigned_to,
            returned_at: key.returned_at,
            updated_at: new Date().toISOString()
          })
          .eq("id", key.id);
      }

      if (positionUpdated && session.parking_position_id) {
        await supabase
          .from("parking_positions")
          .update({
            status: "occupied"
          })
          .eq("id", session.parking_position_id);
      }

      if (slotUpdated && session.parking_slot) {
        await supabase
          .from("parking_slots")
          .update({
            status: "occupied"
          })
          .eq("slot_number", session.parking_slot);
      }

      console.error(
        "Complete parking session update error:",
        updateSessionError
      );

      return res.status(400).json({
        success: false,
        message:
          updateSessionError?.message ||
          "Unable to complete vehicle return."
      });
    }

    const { error: duplicateSessionsError } = await supabase
      .from("parking_sessions")
      .update({
        status: "returned_completed",
        completed_at: completedAt
      })
      .eq("vehicle_id", session.vehicle?.id)
      .neq("id", id)
      .in("status", ACTIVE_STATUSES);

    if (duplicateSessionsError) {
      console.error(
        "Close duplicate active vehicle sessions error:",
        duplicateSessionsError
      );
    }

    const customer = session.vehicle?.customer;

    if (customer?.id) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert([
          {
            parking_session_id: updatedSession.id,
            recipient_type: "customer",
            recipient_id: customer.id,
            message: "Your vehicle has been returned successfully.",
            channel: "in_app",
            status: "sent",
            sent_at: completedAt
          }
        ]);

      if (notificationError) {
        console.error(
          "Vehicle returned notification error:",
          notificationError
        );
      }
    }

    notifyCustomerInBackground({
      event: "returned",
      sessionId: updatedSession.id,
      customer,
      data: {
        plate: session.vehicle?.license_plate,
        ticketCode: session.ticket_code
      }
    });

    return res.status(200).json({
      success: true,
      message:
        "Vehicle returned successfully, parking position is now available, parking slot is now available, key status is updated, and customer notifications were sent.",
      session: updatedSession
    });
  } catch (error) {
    console.error("Complete return error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const getRetrievalRequests = async (req, res) => {
  try {
    const { search, status } = req.query;

    const allowedStatuses = [
      "retrieval_requested",
      "retrieving",
      "ready_for_pickup"
    ];

    let query = supabase
      .from("parking_sessions")
      .select(`
        id,
        ticket_code,
        parking_type,
        status,
        parking_slot,
        checked_in_at,
        parked_at,
        vehicle:vehicles (
          id,
          license_plate,
          make,
          model,
          color,
          customer:customers (
            id,
            name,
            phone,
            email
          )
        ),
        valet:employees (
          id,
          name,
          phone,
          role
        )
      `)
      .in("status", allowedStatuses)
      .order("checked_in_at", { ascending: false });

    if (status && allowedStatuses.includes(status)) {
      query = query.eq("status", status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error("Get retrieval requests error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    let result = requests || [];

    if (search) {
      const searchTerm = search.toLowerCase();

      result = result.filter((request) => {
        const vehicleNumber =
          request.vehicle?.license_plate?.toLowerCase() || "";

        const customerName =
          request.vehicle?.customer?.name?.toLowerCase() || "";

        const customerPhone =
          request.vehicle?.customer?.phone?.toLowerCase() || "";

        const slot =
          request.parking_slot?.toLowerCase() || "";

        const valet =
          request.valet?.name?.toLowerCase() || "";

        return (
          vehicleNumber.includes(searchTerm) ||
          customerName.includes(searchTerm) ||
          customerPhone.includes(searchTerm) ||
          slot.includes(searchTerm) ||
          valet.includes(searchTerm)
        );
      });
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      requests: result
    });
  } catch (error) {
    console.error("Get retrieval requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch retrieval requests."
    });
  }
};


const verifyExit = async (req, res) => {
  try {
    const { ticket_code } = req.body;

    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        message: "Ticket code is required"
      });
    }

    const normalizedTicket = ticket_code.trim().toUpperCase();

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .select(`
        *,
        vehicle:vehicles(
          id,
          license_plate,
          make,
          model,
          color,
          customer_id,
          customer:customers(
            id,
            name,
            phone,
            email
          )
        )
      `)
      .eq("ticket_code", normalizedTicket)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking ticket not found"
      });
    }

    if (session.status === "returned_completed") {
      return res.status(400).json({
        success: false,
        message: "This ticket has already been completed"
      });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("parking_session_id", session.id)
      .eq("payment_status", "paid")
      .maybeSingle();

    if (paymentError) {
      return res.status(500).json({
        success: false,
        message: "Failed to verify payment"
      });
    }

    if (!payment) {
      return res.status(400).json({
        success: false,
        message: "Payment is not completed"
      });
    }

    if (session.parking_type === "valet") {
      if (session.status !== "ready_for_pickup") {
        return res.status(400).json({
          success: false,
          message: "Vehicle is not ready for pickup"
        });
      }

      req.params.id = session.id;
      return completeReturn(req, res);
    }

    if (session.parking_type === "self") {
      if (session.status !== "parked") {
        return res.status(400).json({
          success: false,
          message: "Self-parking vehicle is not currently parked"
        });
      }

      if (session.parking_position_id) {
        const { error: positionError } = await supabase
          .from("parking_positions")
          .update({
            status: "available"
          })
          .eq("id", session.parking_position_id)
          .eq("status", "occupied");

        if (positionError) {
          return res.status(500).json({
            success: false,
            message: "Failed to release parking position"
          });
        }
      }

      const { data: completedSession, error: completeError } = await supabase
        .from("parking_sessions")
        .update({
          status: "returned_completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", session.id)
        .eq("status", "parked")
        .select()
        .single();

      if (completeError || !completedSession) {
        if (session.parking_position_id) {
          await supabase
            .from("parking_positions")
            .update({
              status: "occupied"
            })
            .eq("id", session.parking_position_id)
            .eq("status", "available");
        }

        return res.status(409).json({
          success: false,
          message: "Parking session was already updated"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Exit verified successfully",
        exit: {
          verified: true,
          verified_by: req.user.id,
          ticket_code: normalizedTicket
        },
        session: completedSession
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid parking type"
    });
  } catch (error) {
    console.error("Verify exit error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify vehicle exit",
      error: error.message
    });
  }
};
const getParkingHistory = async (req, res) => {
  try {
    const { search, parking_type } = req.query;

    let query = supabase
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
          license_plate,
          make,
          model,
          customer:customers (
            name,
            phone
          )
        ),
        valet:employees (
          id,
          name,
          phone
        )
      `)
      .eq("status", "returned_completed")
      .order("completed_at", { ascending: false });

    if (parking_type) {
      query = query.eq("parking_type", parking_type);
    }

    const { data: history, error } = await query;

    if (error) {
      console.error("Get parking history error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    let result = (history || []).map((session) => {
      let duration = null;

      if (session.checked_in_at && session.completed_at) {
        const start = new Date(session.checked_in_at);
        const end = new Date(session.completed_at);

        const durationMinutes = Math.round(
          (end - start) / (1000 * 60)
        );

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        duration =
          hours > 0
            ? `${hours}h ${minutes}m`
            : `${minutes}m`;
      }

      return {
        ...session,
        vehicle_number:
          session.vehicle?.license_plate || null,
        customer_name:
          session.vehicle?.customer?.name || null,
        customer_phone:
          session.vehicle?.customer?.phone || null,
        valet_name:
          session.valet?.name || null,
        parking_duration: duration
      };
    });

    if (search) {
      const searchTerm = search.toLowerCase();

      result = result.filter((session) =>
        session.vehicle_number
          ?.toLowerCase()
          .includes(searchTerm) ||
        session.customer_name
          ?.toLowerCase()
          .includes(searchTerm) ||
        session.customer_phone
          ?.toLowerCase()
          .includes(searchTerm) ||
        session.parking_slot
          ?.toLowerCase()
          .includes(searchTerm) ||
        session.ticket_code
          ?.toLowerCase()
          .includes(searchTerm)
      );
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      history: result
    });
  } catch (error) {
    console.error("Get parking history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parking history."
    });
  }
};

const getActiveParkingSessions = async (req, res) => {
  try {
    const activeStatuses = [
      "checked_in",
      "parked",
      "retrieval_requested",
      "retrieving",
      "ready_for_pickup"
    ];

    const { data: sessions, error } = await supabase
      .from("parking_sessions")
      .select(`
        id,
        ticket_code,
        parking_type,
        status,
        parking_slot,
        checked_in_at,
        parked_at,
        vehicles (
          id,
          license_plate,
          make,
          model,
          color,
          customers (
            id,
            name,
            phone,
            email
          )
        ),
        employees (
          id,
          name,
          phone,
          role
        )
      `)
      .in("status", activeStatuses)
      .order("checked_in_at", { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      sessions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};


const getReceptionValets = async (req, res) => {
  try {
    const { data: valets, error } = await supabase
      .from("users")
      .select("id, name, email, role, is_active, created_at")
      .eq("role", "valet")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get reception valets error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: valets?.length || 0,
      valets: valets || []
    });
  } catch (error) {
    console.error("Get reception valets error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const getReceptionDashboard = async (req, res) => {
  try {
    const activeStatuses = [
      "checked_in",
      "parked",
      "retrieval_requested",
      "retrieving",
      "ready_for_pickup"
    ];

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfDayISO = startOfDay.toISOString();

    const {
      data: activeSessions,
      error: activeError
    } = await supabase
      .from("parking_sessions")
      .select("id, status")
      .in("status", activeStatuses);

    if (activeError) {
      return res.status(500).json({
        success: false,
        message: activeError.message
      });
    }

    const {
      data: todayCheckIns,
      error: checkInError
    } = await supabase
      .from("parking_sessions")
      .select("id")
      .gte("checked_in_at", startOfDayISO);

    if (checkInError) {
      return res.status(500).json({
        success: false,
        message: checkInError.message
      });
    }

    const awaitingRetrieval = (activeSessions || []).filter(
      (session) =>
        session.status === "retrieval_requested"
    ).length;

    const readyForPickup = (activeSessions || []).filter(
      (session) =>
        session.status === "ready_for_pickup"
    ).length;

    return res.status(200).json({
      success: true,
      dashboard: {
        active_vehicles:
          activeSessions?.length || 0,
        today_check_ins:
          todayCheckIns?.length || 0,
        awaiting_retrieval: awaitingRetrieval,
        ready_for_pickup: readyForPickup
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const verifyTicket = async (req, res) => {
  try {
    const { ticket_code } = req.params;

    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        message: "Ticket code is required."
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
        checked_in_at,
        parked_at,
        completed_at,
        vehicle:vehicles (
          id,
          license_plate,
          make,
          model,
          color,
          customer:customers (
            id,
            name,
            phone,
            email
          )
        ),
        valet:employees (
          id,
          name,
          phone
        )
      `)
      .eq("ticket_code", ticket_code)
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        message: "Invalid ticket code."
      });
    }

    if (session.status === "returned_completed") {
      return res.status(400).json({
        success: false,
        message: "This ticket has already been completed."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket verified successfully.",
      ticket: {
        ticket_code: session.ticket_code,
        status: session.status,
        parking_type: session.parking_type
      },
      session
    });
  } catch (error) {
    console.error("Verify ticket error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const completeSelfParking = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error: sessionError } =
      await supabase
        .from("parking_sessions")
        .select(
          "id, status, parking_type, parking_slot"
        )
        .eq("id", id)
        .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (session.parking_type !== "self") {
      return res.status(400).json({
        success: false,
        message:
          "This session is not a self-parking session."
      });
    }

    if (session.status !== "parked") {
      return res.status(400).json({
        success: false,
        message:
          "Self-parking vehicle must be parked before checkout."
      });
    }

    const {
      data: updatedSession,
      error: updateSessionError
    } = await supabase
      .from("parking_sessions")
      .update({
        status: "returned_completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("status", "parked")
      .select()
      .single();

    if (updateSessionError) {
      return res.status(400).json({
        success: false,
        message: updateSessionError.message
      });
    }

    if (session.parking_slot) {
      const { error: slotError } = await supabase
        .from("parking_slots")
        .update({
          status: "available"
        })
        .eq("slot_number", session.parking_slot);

      if (slotError) {
        console.error(
          "Free self-parking slot error:",
          slotError
        );

        return res.status(400).json({
          success: false,
          message: slotError.message
        });
      }
    }

    notifySessionEventInBackground({
      event: "returned",
      sessionId: id
    });

    return res.status(200).json({
      success: true,
      message:
        "Self-parking checkout completed successfully and parking slot is now available.",
      session: updatedSession
    });
  } catch (error) {
    console.error("Complete self-parking error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getValetDashboard = async (req, res) => {
  try {
    const { data: valet, error: valetError } = await supabase
      .from("employees")
      .select("id, name, phone, email, role, is_active")
      .eq("email", req.user.email)
      .eq("role", "valet")
      .single();

    if (valetError || !valet) {
      return res.status(404).json({
        success: false,
        message: "Valet employee record not found."
      });
    }

    const { data: sessions, error: sessionError } = await supabase
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
          color,
          customer:customers (
            id,
            name,
            phone,
            email
          )
        ),
        valet:employees (
          id,
          name,
          phone,
          email,
          role
        ),
        key:keys (
          id,
          key_number,
          status,
          assigned_to,
          assigned_at
        )
      `)
      .or(`valet_id.eq.${valet.id},valet_id.eq.${req.user.id}`)
      .order("checked_in_at", { ascending: false });

    if (sessionError) {
      console.error("Get valet dashboard sessions error:", sessionError);

      return res.status(400).json({
        success: false,
        message: sessionError.message
      });
    }

    const result = sessions || [];

    const activeSessions = result.filter((session) =>
      ACTIVE_STATUSES.includes(session.status)
    );

    const assignedVehicles = activeSessions.filter(
      (session) =>
        session.status === "checked_in" ||
        session.status === "parked"
    ).length;

    const parkedVehicles = activeSessions.filter(
      (session) => session.status === "parked"
    ).length;

    const retrievalRequests = activeSessions.filter(
      (session) => session.status === "retrieval_requested"
    ).length;

    const retrievingVehicles = activeSessions.filter(
      (session) => session.status === "retrieving"
    ).length;

    const readyForPickup = activeSessions.filter(
      (session) => session.status === "ready_for_pickup"
    ).length;

    const completedReturns = result.filter(
      (session) => session.status === "returned_completed"
    ).length;

    return res.status(200).json({
      success: true,
      valet: {
        id: valet.id,
        name: valet.name,
        phone: valet.phone,
        email: valet.email,
        role: valet.role,
        is_active: valet.is_active
      },
      dashboard: {
        assigned_vehicles: assignedVehicles,
        parked_vehicles: parkedVehicles,
        retrieval_requests: retrievalRequests,
        retrieving_vehicles: retrievingVehicles,
        ready_for_pickup: readyForPickup,
        completed_returns: completedReturns
      },
      sessions: activeSessions
    });
  } catch (error) {
    console.error("Get valet dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

module.exports = {
  getParkingSessions,
  getActiveParkingSessions,
  getValetDashboard,
  getReceptionDashboard,
  getReceptionValets,
  createParkingSession,
  verifyExit,
  quickCheckIn,
  verifyTicket,
  assignParkingSlot,
  assignValet,
  requestRetrieval,
  startRetrieval,
  markReadyForPickup,
  completeReturn,
  completeSelfParking,
  getRetrievalRequests,
  getParkingHistory
};