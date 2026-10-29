
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { makeAdminToken } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body.accessCode ?? "").trim();

    if (!code || code.length > 100) {
      return NextResponse.json(
        { error: "Kode akses tidak valid." },
        { status: 400 }
      );
    }

    // Admin tetap dapat masuk melalui form kode akses yang sama.
    const adminPassword = process.env.ADMIN_PASSWORD ?? "";

    if (adminPassword && safeEqual(code, adminPassword)) {
      const token = await makeAdminToken();
      return NextResponse.json({ role: "admin", token });
    }

    // Cari pemilih berdasarkan hash kode akses.
    const codeHash = createHash("sha256")
      .update(code)
      .digest("hex");

    const { data: voter, error } = await supabaseAdmin
      .from("voter_codes")
      .select("id, voter_name, used_at")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (error) throw error;

    if (!voter) {
      return NextResponse.json(
        { error: "Kode akses tidak valid." },
        { status: 401 }
      );
    }

    if (voter.used_at) {
      return NextResponse.json(
        { error: "Hak Suara Sudah Digunakan" },
        { status: 409 }
      );
    }

    if (!voter.voter_name) {
      return NextResponse.json(
        { error: "Nama pemilih belum terdaftar. Hubungi panitia." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      role: "voter",
      voterName: voter.voter_name
    });
  } catch {
    return NextResponse.json(
      { error: "Tidak dapat memproses kode akses." },
      { status: 500 }
    );
  }
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);

  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
