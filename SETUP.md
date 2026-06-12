# Setup

## 1. Domain Target (`DOMAIN_KIRYUU`)

Project ini scrape data manga dari domain yang ditentukan di `.env`:

```
DOMAIN_KIRYUU=https://v6.kiryuu.to/
```

**Ganti domain** tinggal ubah value-nya. Pastikan strukturnya kompatibel (WordPress + theme yang sama).

## 2. Cloudflare Bypass (`CF_COOKIE`)

Beberapa domain (termasuk `v6.kiryuu.to`) dilindungi Cloudflare Managed Challenge. Scraper bakal kena 403 kalau gak punya cookie `cf_clearance`.

### Cara dapetin cookie:
1. Buka `https://v6.kiryuu.to/` di Chrome/Firefox biasa
2. Kalau muncul captcha "I'm not a robot", selesaikan
3. Buka DevTools (`F12`) → tab **Application** (Chrome) atau **Storage** (Firefox)
4. Kiri: **Cookies** → klik `https://v6.kiryuu.to`
5. Cari baris `cf_clearance`, copy **Value**-nya
6. Tambahkan ke `.env`:
   ```
   CF_COOKIE=cf_clearance=value_yang_di_copy
   ```

Cookie ini expired dalam **30 menit–2 jam**. Kalau tiba-tiba data kosong, ulangi langkah di atas.

### Tanpa CF_COOKIE
Aplikasi tetap bisa di-*build* dan dijalanin, tapi semua halaman akan kosong/error karena 403.

## 3. Environment Variable

File `.env` di root project:

```
DOMAIN_KIRYUU=https://v6.kiryuu.to/
CF_COOKIE=cf_clearance=...
```

## 4. Menjalankan

```bash
npm install        # install dependencies
npm run dev        # development server
npm run build      # production build
npm run start      # start production server
```

## 5. Catatan

- Path alias `@/` = root project (`./*`), bukan `./src/*`
- Semua data dari scraper, gak ada database
- Semua halaman yang fetch data sifatnya **dynamic** (gak di-prerender waktu build)
