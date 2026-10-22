const nodemailer = require("nodemailer");
require("dotenv").config();

const emailUser = process.env.EMAIL_USER?.trim();
const emailAppPassword = process.env.EMAIL_APP_PASSWORD?.trim();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailAppPassword
  }
});

const assertEmailConfigured = () => {
  if (!emailUser || !emailAppPassword) {
    throw new Error(
      "Email service is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD in backend/.env and restart the backend."
    );
  }
};

const sendInvoiceEmail = async ({
  customerEmail,
  customerName,
  invoiceNumber,
  pdfBuffer
}) => {
  assertEmailConfigured();

  await transporter.sendMail({
    from: `"Aura Valet Parking System" <${emailUser}>`,
    to: customerEmail,
    subject: `Invoice ${invoiceNumber} - Aura Valet Parking System`,
    text: `Hello ${customerName || "Customer"},\n\nThank you for using Aura Valet Parking System.\n\nPlease find your parking invoice attached.\n\nInvoice: ${invoiceNumber}\n\nThank you.`,
    attachments: [
      {
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf"
      }
    ]
  });
};

module.exports = {
  transporter,
  sendInvoiceEmail,
  assertEmailConfigured
};