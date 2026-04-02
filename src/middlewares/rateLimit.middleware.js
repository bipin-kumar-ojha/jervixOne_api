import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req); // ✅ safe for IPv4 + IPv6
    const email = req.body?.email || "unknown";
    return `${ip}-${email}`;
  },

  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});