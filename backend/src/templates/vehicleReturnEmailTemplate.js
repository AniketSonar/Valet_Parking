const createVehicleReturnEmail = ({
  customerName,
  vehicleNumber,
  vehicleModel,
  ticketCode,
  parkingSlot,
  completedAt
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Valet Parking</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#1f2937;">
  <div style="max-width:620px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,0.08);">

    <div style="background:#111827;padding:28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:28px;">Aura</h1>
      <p style="margin:8px 0 0;color:#d1d5db;font-size:14px;">Valet Parking</p>
    </div>

    <div style="padding:32px;">
      <h2 style="margin-top:0;color:#111827;">Vehicle Returned Successfully</h2>

      <p style="font-size:15px;line-height:1.6;">
        Hello ${customerName},
      </p>

      <p style="font-size:15px;line-height:1.6;">
        Your vehicle has been successfully returned. Thank you for choosing Aura Valet Parking.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:24px 0;">
        <h3 style="margin-top:0;color:#111827;">Parking Details</h3>

        <p style="margin:10px 0;"><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
        <p style="margin:10px 0;"><strong>Vehicle Model:</strong> ${vehicleModel}</p>
        <p style="margin:10px 0;"><strong>Ticket Code:</strong> ${ticketCode}</p>
        <p style="margin:10px 0;"><strong>Parking Slot:</strong> ${parkingSlot || "N/A"}</p>
        <p style="margin:10px 0;"><strong>Return Time:</strong> ${completedAt}</p>
      </div>

      <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin-top:24px;">
        <p style="margin:0;font-size:14px;line-height:1.6;">
          Your parking session has been completed successfully.
        </p>
      </div>

      <p style="font-size:15px;line-height:1.6;margin-top:28px;">
        Thank you for choosing <strong>Aura Valet Parking</strong>.
      </p>
    </div>

    <div style="background:#111827;padding:20px;text-align:center;">
      <p style="margin:0;color:#d1d5db;font-size:12px;">
        Aura Valet Parking System
      </p>
    </div>

  </div>
</body>
</html>
  `;
};

module.exports = createVehicleReturnEmail;