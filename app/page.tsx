
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Candidate = {
  id: string;
  number: number;
  name: string;
  tagline: string;
  photo: string;
};

const candidates: Candidate[] = [
  {
    id: "paslon-1",
    number: 1,
    name: "Madina Nirmala - Hasnayah Zalfa",
    tagline: "Visi: Menumbuhkan semangat kepemimpinan dan mewujudkan OSIS kreatif dan inovatif\nMisi: Menjadikan Al Qur'an dan Pancasila sebagai landasan utama",
    photo: "/paslon-1.jpg",
  },
  {
    id: "paslon-2",
    number: 2,
    name: "Mutiara Dewi - Tisya Nurul",
    tagline: "Visi: Mewujudkan OSIS sebagai wadah aspirasi dan pengembangan potensi terpendam siswi\nMisi: Mengoptimalkan peran OSIS sebagai jembatan komunikasi antar siswi dan guru",
    photo: "/paslon-2.jpg",
  },
];

type Result = {
  name: string;
  votes: number;
};

export default function Home() {
  const [accessCode, setAccessCode] = useState("");
  const [voterName, setVoterName] = useState("");
  const [voteComplete, setVoteComplete] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(10);
  const [loadingVoters, setLoadingVoters] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");

  const [results, setResults] = useState<Result[] | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsPassword, setResultsPassword] = useState("");
  const [resultsPasswordError, setResultsPasswordError] = useState("");
  const [resultsBusy, setResultsBusy] = useState(false);

  const [voters, setVoters] = useState<
    { name: string; status: string }[] | null
  >(null);

  // LOGIN PEMILIH / ADMIN

  async function enterWithCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Kode akses tidak valid.");
      }

      if (data.role === "admin") {
        setIsAdmin(true);
        setAdminToken(data.token);
        setLoggedIn(true);
        setResults(null);
      } else {
        setIsAdmin(false);
        setVoterName(data.voterName);
        setLoggedIn(true);
      }
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setBusy(false);
    }
  }

  async function enterAdmin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAdminPasswordError("");
    setNotice("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Password salah. Silakan coba lagi.");
      }

      setIsAdmin(true);
      setAdminToken(data.token);
      setLoggedIn(true);
      setShowAdminLogin(false);
      setAdminPassword("");
      setAdminPasswordError("");
      setResults(null);
    } catch (err) {
      setAdminPasswordError(
        err instanceof Error
          ? err.message
          : "Password salah. Silakan coba lagi."
      );
    } finally {
      setBusy(false);
    }
  }

  // DATA DASHBOARD ADMIN

  async function loadVoters() {
    if (!adminToken) {
      setNotice("Sesi admin tidak valid. Silakan login kembali.");
      return;
    }

    setLoadingVoters(true);
    setNotice("");

    try {
      const res = await fetch("/api/admin/voters", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil daftar pemilih.");
      }

      setVoters(data.voters);
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil daftar pemilih."
      );
    } finally {
      setLoadingVoters(false);
    }
  }

  async function loadResults() {
    if (!adminToken || !resultsPassword) {
      setResultsPasswordError("Password rekap wajib diisi.");
      return;
    }

    setResultsBusy(true);
    setResultsPasswordError("");

    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ password: resultsPassword }),
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil rekap suara.");
      }

      setResults(data.results);
      setResultsPassword("");
      setResultsPasswordError("");
      setShowResultsModal(false);
      setNotice("Rekap suara berhasil dibuka.");
    } catch (err) {
      setResultsPasswordError(
        err instanceof Error ? err.message : "Gagal mengambil rekap suara."
      );
    } finally {
      setResultsBusy(false);
    }
  }

  useEffect(() => {
    if (!isAdmin || !adminToken) return;

    void loadVoters();

    const channel = supabaseBrowser
      .channel("election-updates-admin")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "election_updates",
        },
        () => {
          void loadVoters();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Gagal berlangganan Supabase Realtime.");
        }
      });

    return () => {
      void supabaseBrowser.removeChannel(channel);
    };
  }, [isAdmin, adminToken]);

  // RESET PEMILIHAN

  async function resetElection() {
    if (!adminToken || !resetPassword) {
      setResetPasswordError("Password reset wajib diisi.");
      return;
    }

    const confirmed = window.confirm(
      "PERINGATAN: Semua suara akan dihapus dan seluruh kode pemilih dapat digunakan kembali. Nama dan kode akses tetap dipertahankan. Yakin ingin melanjutkan?"
    );

    if (!confirmed) return;

    setResetBusy(true);
    setResetPasswordError("");
    setNotice("");

    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ password: resetPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Password reset salah atau reset gagal.");
      }

      setResetPassword("");
      setResetPasswordError("");
      setShowResetModal(false);
      setChosen(null);
      setVoteComplete(false);
      setRedirectCountdown(10);
      setResults(null);

      await loadVoters();

      setNotice("Reset berhasil. Semua kode pemilih siap digunakan kembali.");
    } catch (err) {
      setResetPasswordError(
        err instanceof Error
          ? err.message
          : "Password reset salah atau reset gagal."
      );
    } finally {
      setResetBusy(false);
    }
  }

  // PEMUNGUTAN SUARA

  async function castVote() {
    if (!chosen) {
      setNotice("Pilih kandidat terlebih dahulu.");
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessCode,
          candidateId: chosen,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Suara tidak dapat disimpan.");
      }

      setVoteComplete(true);
      setRedirectCountdown(10);
      setNotice("Terima kasih! Suara berhasil disimpan.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  // LOGOUT

  function logout() {
    setLoggedIn(false);
    setIsAdmin(false);
    setAdminToken("");
    setResults(null);
    setVoters(null);
    setAccessCode("");
    setChosen(null);
    setVoterName("");
    setVoteComplete(false);
    setRedirectCountdown(10);
    setNotice("");
    setShowResetModal(false);
    setResetPassword("");
    setShowResultsModal(false);
    setResultsPassword("");
    setResultsPasswordError("");
  }

  // HITUNG MUNDUR LOGOUT PEMILIH

  useEffect(() => {
    if (!voteComplete) return;

    if (redirectCountdown <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((seconds) => seconds - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [voteComplete, redirectCountdown]);

  // TAMPILAN

  return (
    <main className="page">
      <nav className="nav container">
        <a className="brand" href="#">
  <img src="/logo.png" alt="Logo E-Voting" className="brand-icon" />
  SMK Kesehatan Daarul Hidayah
</a>

        <button
          type="button"
          className="btn btn-outline btn-small"
          onClick={() => {
            setAdminPassword("");
            setAdminPasswordError("");
            setShowAdminLogin(true);
            setNotice("");
          }}
        >
          <span aria-hidden></span> Dashboard Admin
        </button>
      </nav>

      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="dot" /> SISTEM PEMILIHAN DIGITAL
          </span>

          <h1>
            Mari kita
            <br />
            <span>gunakan hak pilih.</span>
          </h1>

          <p>Gunakan hak pilih dengan bijak.</p>

          <div className="period">
            <div className="period-icon">◷</div>
            <div>
              <strong>Pelaksanaan Pemilihan</strong>
              <small>Jum&apos;at 30 Oktober 2026</small>
            </div>
            <span className="status">Terjadwal</span>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="ballot">
            <div className="ballot-paper">
              ✓<i>✓</i><i>✓</i>
            </div>
            <div className="ballot-front" />
          </div>
          <div className="floating-check">✓</div>
        </div>
      </section>

      {!loggedIn ? (
        <section className="access-card container">
          
<div className="access-symbol">
  <img src="/logo.png" alt="Logo Daarul Hidayah" />
</div>
<h2>Masuk untuk mulai memilih</h2>
<p>Pilihanmu bersifat rahasia</p>


          <form onSubmit={enterWithCode} className="access-form">
            <label htmlFor="access">Kode Akses</label>
            <input
              id="access"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              autoComplete="off"
              required
            />

            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Memeriksa..." : "Masuk"}
            </button>
          </form>

          <p className="helper">
            Belum memiliki kode? Hubungi penyelenggara pemilihan.
          </p>
        </section>
      ) : isAdmin ? (
        <section className="dashboard container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Daftar Pemilih dan Hasil Pemilihan</span>
              <h2>Dashboard Admin</h2>
            </div>

            <div className="header-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={logout}
              >
                Keluar
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setResultsPassword("");
                  setResultsPasswordError("");
                  setShowResultsModal(true);
                  setNotice("");
                }}
              >
                Rekap Suara
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setResetPassword("");
                  setResetPasswordError("");
                  setShowResetModal(true);
                  setNotice("");
                }}
              >
                Reset Pemilihan
              </button>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <span>Total pemilih</span>
              <strong>{voters?.length ?? "—"}</strong>
            </div>

            <div className="stat">
              <span>Sudah memilih</span>
              <strong>
                {voters
                  ? voters.filter((v) => v.status === "Sudah memilih").length
                  : "—"}
              </strong>
            </div>

            <div className="stat">
              <span>Belum memilih</span>
              <strong>
                {voters
                  ? voters.filter((v) => v.status === "Belum memilih").length
                  : "—"}
              </strong>
            </div>
          </div>

          <div className="results-card">
            <div className="section-heading">
              <h3>Daftar pemilih</h3>
            </div>

            {loadingVoters && !voters ? (
              <p className="helper">Memuat daftar pemilih...</p>
            ) : voters && voters.length > 0 ? (
              <div className="voter-table-wrap">
                <table className="voter-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Nama pemilih</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {voters.map((voter, index) => (
                      <tr key={`${voter.name}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{voter.name}</td>
                        <td>
                          <span
                            className={
                              voter.status === "Sudah memilih"
                                ? "voter-status voter-status-done"
                                : "voter-status voter-status-pending"
                            }
                          >
                            {voter.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="helper">
                Belum ada daftar pemilih yang dimuat.
              </p>
            )}
          </div>

          {results !== null && (
            <div className="results-card">
              <div className="section-heading">
                <h3>Rekap suara</h3>
              </div>

              {results.map((r, i) => {
                const total = results.reduce((n, x) => n + x.votes, 0);
                const percentage = total
                  ? Math.round((r.votes / total) * 100)
                  : 0;

                return (
                  <div className="result-row" key={r.name}>
                    <div className="result-label">
                      <span>
                        {i + 1}. {r.name}
                      </span>
                      <strong>
                        {r.votes} suara · {percentage}%
                      </strong>
                    </div>

                    <div className="bar">
                      <span
                        style={{
                          width: `${total ? (r.votes / total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <p className="helper">
                Rekap dibuka oleh admin melalui verifikasi password khusus.
              </p>
            </div>
          )}
        </section>
      ) : voteComplete ? (
        <section className="access-card container">
          
<div className="access-symbol">
  <img src="/logo.png" alt="Logo Daarul Hidayah" />
</div>
<h2>Terima Kasih, {voterName}!</h2>
<p>Suara berhasil disimpan.</p>


          <div className="period">
            <div className="period-icon">✓</div>
            <div>
              <strong>Pemilihan berhasil</strong>
              <small>Terima kasih telah menggunakan hak pilih Anda.</small>
            </div>
          </div>

          <p className="helper">
            Anda akan keluar otomatis dalam {redirectCountdown} detik.
          </p>

          <button className="btn btn-primary" onClick={logout}>
            Keluar Sekarang
          </button>
        </section>
      ) : (
        <section className="voting container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PEMUNGUTAN SUARA CALON KETUA DAN WAKIL KETUA OSIS</span>
              <h2>Selamat datang, {voterName}.</h2>
              <h2>
                Pilih satu kandidat,
                lalu konfirmasi pilihan Anda.
              </h2>
            </div>

            <button
              className="btn btn-outline btn-small"
              onClick={logout}
            >
              Keluar
            </button>
          </div>

          
<div className="candidate-grid">
  {candidates.map((c) => (
    <button
      key={c.id}
      type="button"
      className={`candidate ${chosen === c.id ? "selected" : ""}`}
      onClick={() => setChosen(c.id)}
    >
      <div className="candidate-number">{c.number}</div>

      <img
        src={c.photo}
        alt={`Foto ${c.name}`}
        className="candidate-photo"
      />

      <h3>{c.name}</h3>

      <p className="candidate-tagline">{c.tagline}</p>

      <span className="select-label">
        {chosen === c.id ? "✓ Dipilih" : "Pilih kandidat"}
      </span>
    </button>
  ))}
</div>

          <div className="vote-actions">
            <p>Pilihan tidak dapat diubah setelah dikonfirmasi.</p>

            <button
              className="btn btn-primary"
              disabled={!chosen || busy}
              onClick={castVote}
            >
              {busy ? "Menyimpan..." : "Konfirmasi pilihan"}
            </button>
          </div>
        </section>
      )}

      {notice && (
        <div
          className={`notice container ${
            notice.toLowerCase().includes("berhasil") ? "notice-success" : ""
          }`}
          role="status"
        >
          {notice}
        </div>
      )}

      {/* MODAL LOGIN ADMIN */}

      {showAdminLogin && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowAdminLogin(false);
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Tutup"
              onClick={() => setShowAdminLogin(false)}
            >
              ×
            </button>

            
<div className="modal-symbol modal-logo">
  <img src="/logo.png" alt="Logo Daarul Hidayah" />
</div>
<h2 id="modal-title">Masuk</h2>
<p>Masukkan password untuk melanjutkan.</p>


            <form onSubmit={enterAdmin} className="access-form">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAdminPasswordError("");
                }}
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
              />

              {adminPasswordError && (
                <p className="password-error" role="alert">
                  {adminPasswordError}
                </p>
              )}

              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Memeriksa..." : "Masuk"} <span>→</span>
              </button>
            </form>
          </section>
        </div>
      )}

      {/* MODAL PASSWORD REKAP */}

      {showResultsModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !resultsBusy) {
              setShowResultsModal(false);
              setResultsPassword("");
              setResultsPasswordError("");
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="results-modal-title"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Tutup"
              disabled={resultsBusy}
              onClick={() => {
                setShowResultsModal(false);
                setResultsPassword("");
                setResultsPasswordError("");
              }}
            >
              ×
            </button>

            
<div className="modal-symbol modal-logo">
  <img src="/logo.png" alt="Logo Daarul Hidayah" />
</div>
<h2 id="results-modal-title">Rekap Suara</h2>
<p>
  Masukkan password rekap khusus untuk melihat hasil pemilihan.
</p>


            <form
              onSubmit={(e) => {
                e.preventDefault();
                void loadResults();
              }}
              className="access-form"
            >
              <label htmlFor="results-password">Password rekap</label>
              <input
                id="results-password"
                type="password"
                value={resultsPassword}
                onChange={(e) => {
                  setResultsPassword(e.target.value);
                  setResultsPasswordError("");
                }}
                placeholder="Masukkan password rekap"
                autoComplete="off"
                required
                disabled={resultsBusy}
              />

              {resultsPasswordError && (
                <p className="password-error" role="alert">
                  {resultsPasswordError}
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={resultsBusy}
                  onClick={() => {
                    setShowResultsModal(false);
                    setResultsPassword("");
                    setResultsPasswordError("");
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resultsBusy || !resultsPassword}
                >
                  {resultsBusy ? "Memeriksa..." : "Lihat Rekap"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL RESET PEMILIHAN */}

      {showResetModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !resetBusy) {
              setShowResetModal(false);
              setResetPassword("");
              setResetPasswordError("");
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Tutup"
              disabled={resetBusy}
              onClick={() => {
                setShowResetModal(false);
                setResetPassword("");
                setResetPasswordError("");
              }}
            >
              ×
            </button>

            
<div className="modal-symbol modal-logo">
  <img src="/logo.png" alt="Logo Daarul Hidayah" />
</div>
<h2 id="reset-modal-title">Reset Pemilihan</h2>


            <p>
              Masukkan password reset khusus. Semua suara akan dihapus,
              sedangkan nama dan kode akses pemilih tetap dipertahankan.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void resetElection();
              }}
              className="access-form"
            >
              <label htmlFor="reset-password">Password reset khusus</label>

              <input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => {
                  setResetPassword(e.target.value);
                  setResetPasswordError("");
                }}
                placeholder="Password reset khusus"
                autoComplete="new-password"
                required
                disabled={resetBusy}
              />

              {resetPasswordError && (
                <p className="password-error" role="alert">
                  {resetPasswordError}
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetPassword("");
                    setResetPasswordError("");
                  }}
                  disabled={resetBusy}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetBusy || !resetPassword}
                >
                  {resetBusy ? "Memproses..." : "Lanjutkan Reset"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <footer className="footer container">
        <span>© {new Date().getFullYear()} E-Voting</span>
      </footer>
    </main>
  );
}
