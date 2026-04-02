import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.titan.email",
  port: 465,
  secure: true,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Connection failed:", error);
  } else {
    console.log("✅ Connection successful");
  }
});