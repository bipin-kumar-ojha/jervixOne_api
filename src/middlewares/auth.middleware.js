import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, "Unauthorized");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "jervix-api",
      audience: "jervix-app",
    });

    if (decoded.type !== "access") {
      throw new ApiError(401, "Invalid token type");
    }

    const user = await User.findOne({
      _id: decoded.sub,
      isDeleted: false,
      isActive: true,
    }).populate("role", "name permissions");

    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    // 🔐 Token version validation
    if (decoded.tv !== user.tokenVersion) {
      throw new ApiError(401, "Token expired");
    }

    req.user = {
      _id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      email: user.email,
      organizationId: user.organizationId ?? null,
    };

    next();
  } catch (error) {
    next(error);
  }
};