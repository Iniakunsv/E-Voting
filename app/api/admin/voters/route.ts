
import { NextResponse } from "next/server";
import { isAdminToken } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

    if (!(await isAdminToken(token))) {
      return NextResponse.json(
        { error: "Akses ditolak." },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("voter_codes")
      .select("voter_name, used_at")
      .order("voter_name", { ascending: true });

    if (error) throw error;

    const voters = (data ?? []).map((voter) => ({
      name: voter.voter_name ?? "Nama belum tersedia",
      status: voter.used_at ? "Sudah memilih" : "Belum memilih",
    }));

    return NextResponse.json({ voters });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil daftar pemilih." },
      { status: 500 }
    );
  }
}
