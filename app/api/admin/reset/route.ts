
import { timingSafeEqual } from "node:crypto";
import { isAdminToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  return (
    aBuffer.length === bBuffer.length &&
    timingSafeEqual(aBuffer, bBuffer)
  );
}

export async function POST(request: Request) {
  try {
    // 1. Periksa sesi admin
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token || !(await isAdminToken(token))) {
      return Response.json(
        { error: "Sesi admin tidak valid. Silakan login kembali." },
        { status: 401 }
      );
    }

    // 2. Periksa password reset khusus
    const resetPassword = process.env.RESET_PASSWORD;

    if (!resetPassword) {
      return Response.json(
        { error: "RESET_PASSWORD belum dikonfigurasi di server." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!password || !safeCompare(password, resetPassword)) {
      return Response.json(
        { error: "Password reset salah." },
        { status: 403 }
      );
    }

    // 3. Jalankan reset secara atomik di Supabase
    const { error } = await supabaseAdmin.rpc("reset_election");

    if (error) {
      console.error("Election reset failed:", error.message);

      return Response.json(
        { error: "Reset gagal dijalankan. Periksa konfigurasi database." },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Pemilihan berhasil direset."
    });
  } catch (error) {
    console.error("Reset API error:", error);

    return Response.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
