import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import { logAudit } from "../services/audit.service.js";

export const login = asyncHandler(async (req, res) => {
  console.log("Login attempt with data:", req.body);
  const { email, password } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();

  const invalidResponse = () => {
    throw new ApiError(401, "Invalid email or password");
  };

  const user = await User.findOne({
    email: normalizedEmail,
    isActive: true,
    isDeleted: false,
  })
    .populate("role")
    .populate("organizationId", "name orgCode plan subscriptionStatus")
    .select("+password");

  if (!user) {
     await logAudit({
        action: "LOGIN_FAILED",
        metadata: { email: normalizedEmail },
        resource: "Auth",
        req,
      });
    return invalidResponse();
  }

  // 🔒 Check if account is locked
  if (user.isLocked()) {
  await logAudit({
    userId: user._id,
    action: "ACCOUNT_LOCKED_LOGIN_ATTEMPT",
    resource: "Auth",
    req,
  });

  throw new ApiError(
    423,
    "Account locked due to multiple failed login attempts. Try again later."
  );
}

  const passwordMatch = await user.comparePassword(password);

  if (!passwordMatch) {
    await user.incrementLoginAttempts();
    await logAudit({
      userId: user._id,
      action: "LOGIN_FAILED",
      resource: "Auth",
      metadata: { email: normalizedEmail },
      req,
    });
    return invalidResponse();
    
  }

  // ✅ Successful login → reset attempts
  await user.resetLoginAttempts();
  const accessToken = jwt.sign(
  {
    sub: user._id.toString(),
    tv: user.tokenVersion,
    type: "access",
  },
  env.jwtSecret,
  {
    expiresIn: env.jwtExpiresIn,
    issuer: "jervix-api",
    audience: "jervix-app",
    algorithm: "HS256",
  }
);

const refreshToken = jwt.sign(
  {
    sub: user._id.toString(),
    type: "refresh",
  },
  env.jwtRefreshSecret,
  {
    expiresIn: env.jwtRefreshExpiresIn,
    issuer: "jervix-api",
    audience: "jervix-app",
    algorithm: "HS256",
  }
);

const hashedRefreshToken = crypto
  .createHash("sha256")
  .update(refreshToken)
  .digest("hex");

user.lastLoginAt = new Date();
user.sessions.push({
  token: hashedRefreshToken,
  ip: req.ip,
  userAgent: req.headers["user-agent"]
});

await user.save();

await logAudit({
  userId: user._id,
  action: "LOGIN_SUCCESS",
  resource: "Auth",
  req,
});

  res.status(200).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: {
        id: user.role._id,
        name: user.role.name,
        permissions: user.role.permissions,
        isSystem: user.role.isSystem
      },
      organization: user.organizationId ? {
        id: user.organizationId._id,
        name: user.organizationId.name,
        orgCode: user.organizationId.orgCode,
        plan: user.organizationId.plan,
        subscriptionStatus: user.organizationId.subscriptionStatus,
      } : null,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token required");
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, env.jwtRefreshSecret, {
      issuer: "jervix-api",
      audience: "jervix-app",
    });
  } catch {
      await logAudit({
      action: "TOKEN_REFRESH_FAILED",
      resource: "Auth",
      metadata: {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
      req,
    });

    throw new ApiError(401, "Invalid refresh token");
  }

  if (decoded.type !== "refresh") {
    await logAudit({
      action: "TOKEN_REFRESH_FAILED",
      resource: "Auth",
      metadata: {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
      req,
    });
    throw new ApiError(401, "Invalid token type");
  }

  const user = await User.findOne({
    _id: decoded.sub,
    isActive: true,
    isDeleted: false,
  }).select("+refreshToken");

  if (!user) {
    await logAudit({
      action: "TOKEN_REFRESH_FAILED",
      resource: "Auth",
      metadata: {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
      req,
    });

    throw new ApiError(401, "Invalid refresh token");
  }

  const hashedIncoming = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  const session = user.sessions.find(
      (s) => s.token === hashedIncoming
    );

    if (!session) {

      user.tokenVersion += 1;
      user.sessions = [];

      await user.save({ validateBeforeSave: false });

      await logAudit({
        userId: user._id,
        action: "TOKEN_THEFT_DETECTED",
        resource: "Auth",
        req,
      });

      throw new ApiError(401, "Refresh token mismatch");
    }

  // ==============================
  // ROTATION — Generate New Tokens
  // ==============================


  const newAccessToken = jwt.sign(
    {
      sub: user._id.toString(),
      tv: user.tokenVersion,
      type: "access",
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      issuer: "jervix-api",
      audience: "jervix-app",
      algorithm: "HS256",
    }
  );

  const newRefreshToken = jwt.sign(
  {
    sub: user._id.toString(),
    type: "refresh",
  },
  env.jwtRefreshSecret,
  {
    expiresIn: env.jwtRefreshExpiresIn,
    issuer: "jervix-api",
    audience: "jervix-app",
    algorithm: "HS256",
  }
);

  const hashedNewRefreshToken = crypto
    .createHash("sha256")
    .update(newRefreshToken)
    .digest("hex");

  session.token = hashedNewRefreshToken;

  await user.save({ validateBeforeSave: false });
  await logAudit({
    userId: user._id,
    action: "TOKEN_REFRESH",
    resource: "Auth",
    req,
  });

  res.status(200).json({
    success: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.refreshToken)
    .digest("hex");

  await User.updateOne(
    { _id: userId },
    {
      $pull: { sessions: { token: hashedToken } }
    }
  );

  await logAudit({
    userId,
    action: "LOGOUT",
    resource: "Auth",
    req,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});