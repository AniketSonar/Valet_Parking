const crypto = require("crypto");

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "valet_parking_customer_token_secret";

function generateCustomerToken(customer) {
  const payload = {
    customerId: customer.id,
    phone: customer.phone,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days validity
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  return `cust_phone_${body}.${signature}`;
}

function verifyCustomerToken(token) {
  if (!token || typeof token !== "string" || !token.startsWith("cust_phone_")) {
    return null;
  }
  const raw = token.slice("cust_phone_".length);
  const dotIndex = raw.indexOf(".");
  if (dotIndex === -1) return null;

  const body = raw.slice(0, dotIndex);
  const signature = raw.slice(dotIndex + 1);
  if (!body || !signature) return null;

  const expectedSig = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  if (expectedSig !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  generateCustomerToken,
  verifyCustomerToken
};
