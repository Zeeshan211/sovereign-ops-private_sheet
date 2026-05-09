# 2026-05-08 — Salah Today-Live Parked State

Purpose: archive Salah details so active state stays short.

---

## Status

PATH B — Salah today-live cleanup is parked.

Do not touch Salah unless operator explicitly switches to PATH B.

---

## Known Completed / Verified

Salah D1 today-live foundation exists.

Previously verified:
- `/api/salah/log v0.2.0` POST worked.
- `/api/salah/today v0.2.0` returned live data for 2026-05-08.

Known live data from prior verification:
- Fajr: Masjid, score 2
- Dhuhr: Masjid, score 2
- Asr: Home, score 0.5
- Maghrib: Home Udhr, score 0.8
- Isha: Home Udhr, score 0.8
- Jumuah: Yes, score 0.5
- total reported score: 6.6
- logged_count: 5
- masjid_count: 2
- home_count: 3
- udhr_count: 2
- qaza_count: 0

---

## Product Correction Agreed

Salah scoring model must be corrected:

- Fard daily score is separate from bonus prayers.
- Fard = core `/10` from:
  - Fajr
  - Dhuhr
  - Asr
  - Maghrib
  - Isha
- Bonus =:
  - Jumuah
  - Tahajjud
  - Witr
  - Ishraq
  - Duha
  - Awwabin
  - Nafl
- Qaza = recovery
- Udhr = attribute, not location/category

---

## Provided But Not Fully Verified

A full rewrite for:
