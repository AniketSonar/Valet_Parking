const supabase = require("../config/supabase");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const { sendInvoiceEmail } = require("../config/email");

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const money = (amount) => {
  return `Rs. ${Number(amount || 0).toFixed(2)}`;
};

const getPaymentDetails = async (paymentId) => {
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    throw new Error("Payment not found.");
  }

  const { data: session, error: sessionError } = await supabase
    .from("parking_sessions")
    .select(`
      id,
      ticket_code,
      status,
      parking_type,
      parking_slot,
      checked_in_at,
      parked_at,
      completed_at,
      vehicle_id,
      valet_id
    `)
    .eq("id", payment.parking_session_id)
    .single();

  if (sessionError || !session) {
    throw new Error("Parking session not found.");
  }

  let vehicle = null;
  let customer = null;
  let valet = null;

  if (session.vehicle_id) {
    const { data: vehicleData, error: vehicleError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", session.vehicle_id)
      .single();

    if (vehicleError) {
      console.error("Vehicle fetch error:", vehicleError);
    } else {
      vehicle = vehicleData;
    }
  }

  if (vehicle?.customer_id) {
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", vehicle.customer_id)
      .single();

    if (customerError) {
      console.error("Customer fetch error:", customerError);
    } else {
      customer = customerData;
    }
  }

  if (session.valet_id) {
    const { data: valetData, error: valetError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", session.valet_id)
      .single();

    if (valetError) {
      console.error("Valet fetch error:", valetError);
    } else {
      valet = valetData;
    }
  }

  return {
    payment,
    session,
    vehicle,
    customer,
    valet
  };
};

const generateInvoicePDF = async ({
  payment,
  session,
  vehicle,
  customer,
  valet
}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });

    const stream = new PassThrough();
    const chunks = [];

    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", reject);

    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const left = 50;
    const right = pageWidth - 50;
    const contentWidth = right - left;

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("INVOICE", left, 50);

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Aura Valet Parking System", left, 82);

    doc
      .fontSize(9)
      .font("Helvetica")
      .text("valet-parking@domain.com", left, 99)
      .text("(XXX)-555-XXXX", left, 113);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Bill To:", left, 155);

    const customerName =
      customer?.full_name ||
      customer?.name ||
      `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
      "Customer";

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(customerName, left, 177);

    doc
      .font("Helvetica")
      .text(customer?.email || "-", left, 193)
      .text(customer?.phone || "-", left, 209);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Invoice Summary:", 330, 155);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Invoice: #${payment.invoice_number || "-"}`, 330, 177)
      .text(`Ticket: ${session.ticket_code || "-"}`, 330, 193)
      .text(`Issued Date: ${formatDate(payment.created_at)}`, 330, 209);

    doc
      .font("Helvetica-Bold")
      .text(`Balance Due: ${money(payment.total_amount)}`, 330, 225);

    doc
      .moveTo(left, 255)
      .lineTo(right, 255)
      .stroke();

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Vehicle Details", left, 275);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `Vehicle: ${vehicle?.make || "-"} ${vehicle?.model || "-"}`,
        left,
        297
      )
      .text(
        `License Plate: ${vehicle?.license_plate || "-"}`,
        left,
        313
      )
      .text(
        `Color: ${vehicle?.color || "-"}`,
        left,
        329
      );

    const valetName =
      valet?.full_name ||
      valet?.name ||
      `${valet?.first_name || ""} ${valet?.last_name || ""}`.trim() ||
      "-";

    doc
      .text(`Valet: ${valetName}`, 330, 297)
      .text(`Parking Type: ${session.parking_type || "-"}`, 330, 313)
      .text(`Parking Slot: ${session.parking_slot || "-"}`, 330, 329);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Parking Details", left, 360);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `Check-in: ${formatDateTime(session.checked_in_at)}`,
        left,
        382
      )
      .text(
        `Parked: ${formatDateTime(session.parked_at)}`,
        330,
        382
      )
      .text(
        `Completed: ${formatDateTime(session.completed_at)}`,
        left,
        400
      );

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Services", left, 435);

    const tableTop = 460;
    const col1 = left;
    const col2 = 325;
    const col3 = 385;
    const col4 = 465;

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Services", col1, tableTop)
      .text("QTY", col2, tableTop)
      .text("Price", col3, tableTop)
      .text("Total", col4, tableTop);

    doc
      .moveTo(left, tableTop + 18)
      .lineTo(right, tableTop + 18)
      .stroke();

    let rowY = tableTop + 30;

    const services = [
      {
        name: "Parking service",
        amount: Number(payment.parking_charge || 0)
      },
      {
        name: "Valet service",
        amount: Number(payment.valet_service_charge || 0)
      },
      {
        name: "Extra charges",
        amount: Number(payment.extra_charges || 0)
      }
    ];

    services.forEach((service) => {
      if (service.amount > 0) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(service.name, col1, rowY)
          .text("1", col2, rowY)
          .text(money(service.amount), col3, rowY)
          .text(money(service.amount), col4, rowY);

        rowY += 22;
      }
    });

    if (Number(payment.discount || 0) > 0) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .text("Discount", col1, rowY)
        .text("1", col2, rowY)
        .text(`-${money(payment.discount)}`, col3, rowY)
        .text(`-${money(payment.discount)}`, col4, rowY);

      rowY += 22;
    }

    doc
      .moveTo(left, rowY + 5)
      .lineTo(right, rowY + 5)
      .stroke();

    const subtotal =
      Number(payment.parking_charge || 0) +
      Number(payment.valet_service_charge || 0) +
      Number(payment.extra_charges || 0) -
      Number(payment.discount || 0);

    const totalsY = rowY + 25;

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Subtotal", 360, totalsY)
      .text(money(subtotal), 465, totalsY)
      .text("GST", 360, totalsY + 20)
      .text(money(payment.gst), 465, totalsY + 20);

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Total", 360, totalsY + 45)
      .text(money(payment.total_amount), 465, totalsY + 45);

    const detailsY = totalsY + 90;

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Payment Details", left, detailsY);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `Payment Method: ${payment.payment_method || "-"}`,
        left,
        detailsY + 22
      )
      .text(
        `Payment Status: ${payment.payment_status || "-"}`,
        left,
        detailsY + 40
      )
      .text(
        `Paid Date: ${formatDateTime(payment.paid_at)}`,
        left,
        detailsY + 58
      );

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Terms & Conditions", left, detailsY + 100);

    doc
      .fontSize(9)
      .font("Helvetica")
      .text("Payment Due Upon Receipt.", left, detailsY + 122)
      .text(
        "Please retain this invoice for your records.",
        left,
        detailsY + 138
      );

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(
        "Thank you for using our valet parking service!",
        left,
        760,
        {
          width: contentWidth,
          align: "center"
        }
      );

    doc.end();
  });
};


const createPayment = async (req, res) => {
  try {
    const {
      parking_session_id,
      parking_charge = 0,
      valet_service_charge = 0,
      extra_charges = 0,
      discount = 0,
      gst = 0,
      payment_method
    } = req.body;

    if (!parking_session_id) {
      return res.status(400).json({
        success: false,
        message: "Parking session ID is required."
      });
    }

    if (!payment_method || !["cash", "online"].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be cash or online."
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .select(`
        id,
        ticket_code,
        status,
        parking_type,
        parking_slot,
        checked_in_at,
        parked_at,
        completed_at,
        vehicle_id,
        valet_id
      `)
      .eq("id", parking_session_id)
      .single();

    if (sessionError || !session) {
      console.error("Session fetch error:", sessionError);

      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (session.status !== "ready_for_pickup") {
      return res.status(400).json({
        success: false,
        message: "Payment can only be created when the vehicle is ready for pickup."
      });
    }

    const parkingCharge = Number(parking_charge);
    const valetServiceCharge = Number(valet_service_charge);
    const extraCharges = Number(extra_charges);
    const discountAmount = Number(discount);
    const gstAmount = Number(gst);

    const amounts = [
      parkingCharge,
      valetServiceCharge,
      extraCharges,
      discountAmount,
      gstAmount
    ];

    if (amounts.some((amount) => !Number.isFinite(amount))) {
      return res.status(400).json({
        success: false,
        message: "All payment amounts must be valid numbers."
      });
    }

    if (amounts.some((amount) => amount < 0)) {
      return res.status(400).json({
        success: false,
        message: "Payment amounts cannot be negative."
      });
    }

    const subtotal =
      parkingCharge +
      valetServiceCharge +
      extraCharges;

    if (discountAmount > subtotal) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot exceed the subtotal."
      });
    }

    const totalAmount =
      subtotal -
      discountAmount +
      gstAmount;

    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Total amount is invalid."
      });
    }

    let vehicle = null;
    let customer = null;

    if (session.vehicle_id) {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", session.vehicle_id)
        .single();

      if (vehicleError) {
        console.error("Vehicle fetch error:", vehicleError);
      } else {
        vehicle = vehicleData;
      }
    }

    if (vehicle?.customer_id) {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", vehicle.customer_id)
        .single();

      if (customerError) {
        console.error("Customer fetch error:", customerError);
      } else {
        customer = customerData;
      }
    }

    const { data: existingPayment, error: existingPaymentError } =
      await supabase
        .from("payments")
        .select("id")
        .eq("parking_session_id", parking_session_id)
        .maybeSingle();

    if (existingPaymentError) {
      console.error("Existing payment check error:", existingPaymentError);

      return res.status(500).json({
        success: false,
        message: "Failed to check existing payment."
      });
    }

    if (existingPayment) {
      return res.status(409).json({
        success: false,
        message: "Payment already exists for this parking session."
      });
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const paymentStatus = "paid";
    const paidAt = new Date().toISOString();

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        parking_session_id,
        parking_charge: parkingCharge,
        valet_service_charge: valetServiceCharge,
        extra_charges: extraCharges,
        discount: discountAmount,
        gst: gstAmount,
        total_amount: totalAmount,
        payment_method,
        payment_status: paymentStatus,
        paid_at: paidAt,
        invoice_number: invoiceNumber
      })
      .select("*")
      .single();

    if (paymentError) {
      console.error("Payment creation error:", paymentError);

      if (paymentError.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Payment already exists for this parking session."
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create payment.",
        error: paymentError.message
      });
    }

    let emailSent = false;

    if (customer?.email) {
      try {
        const invoicePDF = await generateInvoicePDF({
          payment,
          session,
          vehicle,
          customer,
          valet: null
        });

        await sendInvoiceEmail({
          customerEmail: customer.email,
          customerName:
            customer.full_name ||
            customer.name ||
            "Customer",
          invoiceNumber,
          pdfBuffer: invoicePDF
        });

        emailSent = true;
      } catch (emailError) {
        console.error("Invoice email error:", emailError);
      }
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Payment created successfully and invoice emailed."
        : "Payment created successfully.",
      data: {
        payment,
        ticket_code: session.ticket_code,
        vehicle,
        customer,
        email_sent: emailSent
      }
    });
  } catch (error) {
    console.error("Create payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create payment.",
      error: error.message
    });
  }
};


const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required."
      });
    }

    const {
      payment,
      session,
      vehicle,
      customer,
      valet
    } = await getPaymentDetails(id);

    if (payment.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Invoice is available only for paid payments."
      });
    }

    const invoicePDF = await generateInvoicePDF({
      payment,
      session,
      vehicle,
      customer,
      valet
    });

    const fileName = `Invoice-${payment.invoice_number || payment.id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    return res.send(invoicePDF);
  } catch (error) {
    console.error("Invoice generation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate invoice.",
      error: error.message
    });
  }
};

// ============================================================
// CUSTOMER PORTAL - GET MY PAYMENTS
// ============================================================

const getCustomerPayments = async (req, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication required."
      });
    }

    // Find the logged-in customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("email", req.user.email)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found."
      });
    }

    // Find all vehicles owned by this customer
    const { data: vehicles, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, license_plate, make, model, color")
      .eq("customer_id", customer.id);

    if (vehicleError) {
      console.error("Customer payment vehicle fetch error:", vehicleError);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer vehicles."
      });
    }

    const vehicleIds = (vehicles || []).map((vehicle) => vehicle.id);

    if (!vehicleIds.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        payments: []
      });
    }

    // Find this customer's parking sessions
    const { data: sessions, error: sessionError } = await supabase
      .from("parking_sessions")
      .select(`
        id,
        ticket_code,
        status,
        parking_type,
        parking_slot,
        checked_in_at,
        parked_at,
        completed_at,
        vehicle_id
      `)
      .in("vehicle_id", vehicleIds)
      .order("completed_at", { ascending: false });

    if (sessionError) {
      console.error(
        "Customer payment session fetch error:",
        sessionError
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch parking sessions."
      });
    }

    const sessionIds = (sessions || []).map((session) => session.id);

    if (!sessionIds.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        payments: []
      });
    }

    // Find payments belonging to those sessions
    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select(`
        id,
        parking_session_id,
        parking_charge,
        valet_service_charge,
        extra_charges,
        discount,
        gst,
        total_amount,
        payment_method,
        payment_status,
        paid_at,
        invoice_number,
        created_at
      `)
      .in("parking_session_id", sessionIds)
      .order("created_at", { ascending: false });

    if (paymentError) {
      console.error(
        "Customer payment fetch error:",
        paymentError
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer payments."
      });
    }

    // Create quick lookup maps
    const sessionMap = new Map(
      (sessions || []).map((session) => [session.id, session])
    );

    const vehicleMap = new Map(
      (vehicles || []).map((vehicle) => [vehicle.id, vehicle])
    );

    // Attach only customer-owned session and vehicle information
    const result = (payments || []).map((payment) => {
      const session = sessionMap.get(payment.parking_session_id);
      const vehicle = session
        ? vehicleMap.get(session.vehicle_id)
        : null;

      return {
        ...payment,

        parking_session: session
          ? {
              id: session.id,
              ticket_code: session.ticket_code,
              status: session.status,
              parking_type: session.parking_type,
              parking_slot: session.parking_slot,
              checked_in_at: session.checked_in_at,
              parked_at: session.parked_at,
              completed_at: session.completed_at
            }
          : null,

        vehicle: vehicle || null
      };
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      payments: result
    });
  } catch (error) {
    console.error("Get customer payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer payments."
    });
  }
};


// ============================================================
// CUSTOMER PORTAL - DOWNLOAD MY INVOICE
// ============================================================

const downloadCustomerInvoice = async (req, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication required."
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required."
      });
    }

    // Find logged-in customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("email", req.user.email)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found."
      });
    }

    // Get the payment and all associated details
    const {
      payment,
      session,
      vehicle,
      customer: paymentCustomer,
      valet
    } = await getPaymentDetails(id);

    if (!payment || !session) {
      return res.status(404).json({
        success: false,
        message: "Payment not found."
      });
    }

    // SECURITY CHECK:
    // The vehicle connected to the parking session must belong
    // to the currently authenticated customer.
    if (
      !vehicle ||
      vehicle.customer_id !== customer.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this invoice."
      });
    }

    if (payment.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Invoice is available only for paid payments."
      });
    }

    const invoicePDF = await generateInvoicePDF({
      payment,
      session,
      vehicle,
      customer: paymentCustomer || customer,
      valet
    });

    const fileName = `Invoice-${payment.invoice_number || payment.id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    return res.send(invoicePDF);
  } catch (error) {
    console.error(
      "Customer invoice generation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate invoice.",
      error: error.message
    });
  }
};

module.exports = {
  createPayment,
  downloadInvoice,
  getCustomerPayments,
  downloadCustomerInvoice
};