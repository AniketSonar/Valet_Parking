const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

const sendInvoiceEmail = async ({
  customerEmail,
  customerName,
  invoiceNumber,
  pdfBuffer
}) => {
  await transporter.sendMail({
    from: `"Aura Valet Parking System" <${process.env.EMAIL_USER}>`,
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
  sendInvoiceEmail
};