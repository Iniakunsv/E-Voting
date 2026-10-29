
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { isAdminToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CANDIDATES, votingStatus } from "@/lib/voting";

export const runtime = "nodejs";

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  return (
    aBuffer.length === bBuffer.length &&
    timingSafeEqual(aBuffer, bBuffer)
  );
}

export async function POST(req: Request) {
  try {
    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

    if (!token || !(await isAdminToken(token))) {
      return NextResponse.json(
        { error: "Sesi admin tidak valid. Silakan login kembali." },
        { status: 401 }
      );
    }

    const expectedPassword = process.env.RESULTS_PASSWORD;

    if (!expectedPassword) {
      return NextResponse.json(
        { error: "RESULTS_PASSWORD belum dikonfigurasi di server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!password || !safeCompare(password, expectedPassword)) {
      return NextResponse.json(
        { error: "Password rekap salah." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("votes")
      .select("candidate_id");

    if (error) {
      console.error("Gagal mengambil rekap:", error.message);

      return NextResponse.json(
        { error: "Gagal mengambil rekap suara." },
        { status: 500 }
      );
    }

    const results = CANDIDATES.map((candidate) => ({
      name: candidate.name,
      votes: (data ?? []).filter(
        (vote) => vote.candidate_id === candidate.id
      ).length,
    }));

    return NextResponse.json({
      results,
      status: votingStatus().message,
    });
  } catch (error) {
    console.error("Results API error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
