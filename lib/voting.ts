export const CANDIDATES = [
  { id: "paslon-1", name: "Madina Nirmala - Hasnayah Zalfa" },
  { id: "paslon-2", name: "Mutiara Dewi - Tisya Nurul" },
] as const;

export function votingStatus(now = Date.now()) {
  const start = Date.parse(process.env.VOTING_START ?? "");
  const end = Date.parse(process.env.VOTING_END ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { configured: false, open: false, message: "Jadwal pemilihan belum dikonfigurasi dengan benar." };
  }
  if (now < start) return { configured: true, open: false, message: "Pemilihan belum dimulai." };
  if (now >= end) return { configured: true, open: false, message: "Waktu pemilihan telah berakhir." };
  return { configured: true, open: true, message: "Pemilihan sedang berlangsung." };
}