import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { ensureDb } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "medical-record-app-secret-change-in-production"
);

const COOKIE_NAME = "mr_token";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: number, role: string): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; role: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT id, username, real_name, phone, hospital, department, grade, credits, role, is_active FROM users WHERE id = ?",
    args: [payload.userId],
  });

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row || !row.is_active) return null;

  return {
    id: row.id as number,
    username: row.username as string,
    real_name: (row.real_name as string) || "",
    phone: (row.phone as string) || "",
    hospital: (row.hospital as string) || "",
    department: (row.department as string) || "",
    grade: (row.grade as string) || "",
    credits: row.credits as number,
    role: row.role as string,
    is_active: row.is_active as number,
  };
}
