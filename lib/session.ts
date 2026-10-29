import { SignJWT, jwtVerify } from "jose";

const secretText = process.env.SESSION_SECRET;
if (!secretText || secretText.length < 32) {
  // Fail closed in production if a secure secret has not been configured.
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be at least 32 characters.");
}
const secret = new TextEncoder().encode(secretText || "dev-only-secret-change-this-before-deploy-123456");

export async function makeAdminToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret);
}

export async function isAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin";
  } catch { return false; }
}