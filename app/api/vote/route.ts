import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { votingStatus, CANDIDATES } from "@/lib/voting";

export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const status = votingStatus();
    if (!status.open) return NextResponse.json({ error: status.message }, { status: 403 });
    const body = await req.json();
    const code = String(body.accessCode ?? "").trim();
    const candidateId = String(body.candidateId ?? "");
    if (!code || !CANDIDATES.some(c => c.id === candidateId)) {
      return NextResponse.json({ error: "Data pemilihan tidak valid." }, { status: 400 });
    }
    const codeHash = createHash("sha256").update(code).digest("hex");
    const { data: voter, error: voterError } = await supabaseAdmin
      .from("voter_codes").select("id, used_at").eq("code_hash", codeHash).maybeSingle();
    if (voterError) throw voterError;
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
    // RPC transaction atomically records the vote and marks the voter code as used.
    const { error } = await supabaseAdmin.rpc("cast_vote_once", {
      p_voter_id: voter.id,
      p_candidate_id: candidateId
    });
    if (error) {
      if (error.message?.includes("already used")) {
      return NextResponse.json(
      { error: "Hak Suara Sudah Digunakan" },
      { status: 409 }
    );
}
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suara belum dapat disimpan. Silakan hubungi panitia." }, { status: 500 });
  }
}