const nodemailer = require("nodemailer");

const hasSmtpConfig = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const formatCurrency = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

const sendPriceDropEmail = async (product, drops) => {
  if (!product.alertEnabled || !product.email || !drops.length) {
    return { sent: false, reason: "Alert disabled, email missing, or no drops" };
  }

  const dropLines = drops
    .map(
      (drop) =>
        `${drop.platform.toUpperCase()}: ${formatCurrency(drop.previousPrice)} -> ${formatCurrency(
          drop.currentPrice
        )}`
    )
    .join("\n");

  const message = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: product.email,
    subject: `Price drop alert: ${product.title}`,
    text: `Good news! A tracked product price dropped.\n\n${product.title}\n\n${dropLines}\n\nBest deal: ${
      product.bestPlatform || "N/A"
    } at ${formatCurrency(product.lowestPrice || 0)}\n\nAmazon: ${
      product.amazonUrl || "Not tracked"
    }\nFlipkart: ${product.flipkartUrl || "Not tracked"}`,
  };

  if (!hasSmtpConfig()) {
    console.log("Email alert skipped. Add SMTP_HOST, SMTP_USER, and SMTP_PASS.");
    console.log(message);
    return { sent: false, reason: "SMTP is not configured" };
  }

  await createTransporter().sendMail(message);
  return { sent: true };
};

module.exports = {
  sendPriceDropEmail,
};
