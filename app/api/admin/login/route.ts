import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { makeAdminToken } from "@/lib/session";

export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const expected = process.env.ADMIN_PASSWORD ?? "";
    const actual = String(password ?? "");
    const a = Buffer.from(actual); const b = Buffer.from(expected);
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Password tidak valid." }, { status: 401 });
    }
    return NextResponse.json({ token: await makeAdminToken() });
  } catch {
    return NextResponse.json({ error: "Tidak dapat memproses login." }, { status: 500 });
  }
}