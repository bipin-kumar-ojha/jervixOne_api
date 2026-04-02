import crypto from "crypto";

// Generates: JX-8F3K2P (your exact format from requirements)
export const generateActivationCode = () => {
  const part = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
  return `JX-${part}`;
};

// Generates a short org identifier: ORG-AB12CD
export const generateOrgCode = () => {
  const part = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORG-${part}`;
};