// /services/mail.service.js
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

const sendgridApiKey = process.env.SENDGRID_API_KEY;

if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

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

export const sendEmail = async ({ to, subject, html, fromName, replyTo }) => {
  try {
    if (!sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }

    if (!process.env.MAIL_FROM) {
      throw new Error("MAIL_FROM is not configured");
    }

    const msg = {
      to,
      from: getSender(fromName),
      replyTo: replyTo || "support@jervix.com",
      subject,
      html,
    };

    const response = await sgMail.send(msg);

    console.log("📧 Email sent:", response[0].statusCode);
    return response;
  } catch (error) {
    console.error("❌ SendGrid error:", error.response?.body || error.message);
    throw error;
  }
};
