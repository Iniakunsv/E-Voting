
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const count = 50;
const codes = new Set();

while (codes.size < count) {
  const part = randomBytes(5).toString("hex").toUpperCase();
  codes.add(`OSIS-${part}`);
}

const voters = [...codes].map((code) => ({
  code,
  code_hash: createHash("sha256").update(code).digest("hex"),
}));

const csv = [
  "code_hash",
  ...voters.map((voter) => voter.code_hash),
].join("\n");

writeFileSync("voter-codes.csv", csv, "utf8");
writeFileSync(
  "voter-codes-private.txt",
  voters.map((voter, i) => `${i + 1}. ${voter.code}`).join("\n"),
  "utf8",
);

console.log("Berhasil membuat 50 kode akses.");
console.log("CSV untuk Supabase: voter-codes.csv");
console.log("Daftar kode pribadi: voter-codes-private.txt");
