// /services/mail.service.js
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const sendgridApiKey = process.env.SENDGRID_API_KEY;

if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

const hasSmtpConfig = () => {
  return Boolean(
    (process.env.SMTP_HOST || process.env.MAIL_HOST)
    && (process.env.SMTP_PORT || process.env.MAIL_PORT),
  );
};

const getSender = (fromName) => {
  const from = process.env.MAIL_FROM;

  if (!fromName) return from;

  const emailMatch = from?.match(/<([^>]+)>/);
  const email = emailMatch?.[1] || from;

  return {
    email,
    name: fromName,
  };
};

const getSmtpTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT, 10);
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;
  const secureValue = process.env.SMTP_SECURE || process.env.MAIL_SECURE;
  const auth = user && pass
    ? {
      user,
      pass,
    }
    : undefined;

  return nodemailer.createTransport({
    host,
    port,
    secure: secureValue
      ? secureValue === "true"
      : port === 465,
    auth,
  });
};

const getMailMessage = ({ to, subject, html, fromName, replyTo }) => ({
  to,
  from: getSender(fromName),
  replyTo: replyTo || "support@jervix.com",
  subject,
  html,
});

const sendWithSendGrid = async (message) => {
  if (!sendgridApiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }

  const response = await sgMail.send(message);

  console.log("📧 Email sent via SendGrid:", response[0].statusCode);
  return response;
};

const sendWithSmtp = async (message) => {
  if (!hasSmtpConfig()) {
    throw new Error("SMTP_HOST/SMTP_PORT or MAIL_HOST/MAIL_PORT are not configured");
  }

  const response = await getSmtpTransporter().sendMail(message);

  console.log("📧 Email sent via SMTP:", response.messageId);
  return response;
};

export const sendEmail = async ({ to, subject, html, fromName, replyTo }) => {
  if (!process.env.MAIL_FROM) {
    throw new Error("MAIL_FROM is not configured");
  }

  const message = getMailMessage({ to, subject, html, fromName, replyTo });

  try {
    return await sendWithSendGrid(message);
  } catch (sendgridError) {
    console.error("❌ SendGrid error:", sendgridError.response?.body || sendgridError.message);

    if (!hasSmtpConfig()) {
      throw sendgridError;
    }

    try {
      return await sendWithSmtp(message);
    } catch (smtpError) {
      console.error("❌ SMTP fallback error:", smtpError.response?.body || smtpError.message);
      throw smtpError;
    }
  }
};
