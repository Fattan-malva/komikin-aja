# Setup

## 1. Domain Target

Semua scraping relies on 2 domain **utama** (landing page) di `.env`:

```
DOMAIN_KOMIK=https://cosmictoon.to/
DOMAIN_KOMIK_H=https://manhwadesu.com/
```

**Jangan diisi dengan subdomain.** Domain utama biasanya cuma landing page yang
mempunyai tombol "Baca Komik" / "Website Utama" yang mengarah ke subdomain aktif.
`src/lib/resolve.ts` menelusuri tombol tersebut secara otomatis dan menyimpan
hasilnya di memory selama 30 menit, jadi **tidak perlu diubah manual** saat
subdomain berganti atau kena blokir.

### Cara memastikan domain utama benar

| Var | Halaman harus punya | Deteksi |
|---|---|---|
| `DOMAIN_KOMIK` | Tombol **"Baca Komik"** → situs baca komik Cosmic (SvelteKit) | `/_app/immutable/` |
| `DOMAIN_KOMIK_H` | Tombol **"Website Utama"** → situs baca komik WordPress (mangareader) | `listupd` / `eplister` / `ts_reader` |

Landing page sumber komik kadang punya menu tambahan ke situs lain (mis. "Baca
Novel"). Resolver menyaring berdasarkan jenis situs, jadi menu seperti itu akan
diabaikan.

### Kalau gagal menemukan situs

Nyalakan trace untuk melihat alur penelusuran:

```bash
RESOLVE_DEBUG=1 npm run dev
```

LogFormat: `> visit` (dikunjungi), `-> 302` (redirect), `+ enqueue` (kandidat
baru), `! MATCH` (domain ketemu), `x unreachable` (gagal/hang).

Tidak ada cookie Cloudflare / FlareSolverr yang perlu disiapkan.

## 3. Troubleshooting

### Cek cepat kenapa sumber tidak ketemu

Setelah deploy, buka:

```
https://<domain-kamu>.vercel.app/api/resolve-debug
```

Endpoint ini menjalankan penelusuran dari nol dan mengembalikan log tiap hop
(status, `cf-mitigated`, `cf-ray`, `server`, apakah HTML berisi
`/_app/immutable/`, judul halaman). Ini membedakan beberapa penyebab:

| Gejala di log | Artinya |
|---|---|
| `x unreachable ... ECONNREFUSED / ETIMEDOUT` | IP server tidak bisa menjangkau host |
| `cf-mitigated=challenge` | Cloudflare challenged IP datacenter |
| `len` kecil + `has_immutable=false` | dapat halaman lain (mis. halaman blokir) |
| `kind=wordpress expected=cosmic` | ketemu menu lain ("Baca Novel"), bukan bug |

### Kalau IP Vercel diblokir sumber

Beberapa situs memblokir IP datacenter (Vercel egress) padahal rumah tangga bisa
akses. Auto-deteksi butuh shell SPA untuk menemukan host API, jadi kalau
shell-nya terblokir resolver tidak akan menemukan API.

Solusinya set env var cadangan **satu kali**:

| Var | Isi |
|---|---|
| `COSMIC_API_BASE` | Base URL JSON API sumber utama |
| `DOMAIN_KOMIK_H_ORIGIN` | Origin situs baca komik sumber kedua |

Auto-deteksi tetap jadi jalur utama; nilai cadangan hanya dipakai kalau
penelusuran gagal, **dan hanya kalau nilainya masih hidup** (diuji dulu, kalau
host mati akan ditolak). Ada `console.warn` kalau sampai memakai cadangan, jadi
tidak diam-diam.

## 2. Environment Variable

File `.env` di root project cukup dua baris:

```
DOMAIN_KOMIK=https://cosmictoon.to/
DOMAIN_KOMIK_H=https://manhwadesu.com/
```

## 3. Menjalankan

```bash
npm install        # install dependencies
npm run dev        # development server
npm run build      # production build
npm run start      # start production server
```

## 4. Deploy

Siap untuk Vercel serverless — tidak ada `child_process`/`curl`, semua request
lewat `axios`.

- Tambahkan `DOMAIN_KOMIK` dan `DOMAIN_KOMIK_H` di Environment Variables Vercel.
- Route yang butuh data akan dirender on-demand (`ƒ`), jadi `next build`
  tidak pernah memanggil jaringan.
- Resolusi domain_results disimpan per instance. Cache 30 menit, jadi instance
  baru akan membayar 1x resolusi (~2 detik) lalu seterusnya instan.
  Error jaringan memicu resolve ulang otomatis.

## 5. Catatan

- Path alias `@/` = root project (`./*`), bukan `./src/*`
- Semua data dari scraper, tidak ada database
- Semua halaman yang fetch data sifatnya **dynamic** (tidak di-prerender waktu build)
- ~15% entri dari sumber utama tidak punya cover. `SafeImage` merender kotak
  placeholder, bukan `<img src="">` (React menolak string kosong).