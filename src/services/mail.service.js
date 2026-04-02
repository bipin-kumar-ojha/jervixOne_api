// /services/mail.service.js
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const msg = {
      to,
      from: process.env.MAIL_FROM,
      replyTo: "support@jervix.com",
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