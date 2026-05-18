# Features Progress

## Pha 1 - Core app skeleton
- [x] Tao project Flutter Android-first.
- [x] Setup local SQLite database schema cho tu vung, tien do hoc, ngay hoc, import_progress.
- [x] Trich toan bo du lieu tu file XLSX sang source code hardcoded.
- [x] Implement SM-2 scheduler core.
- [x] Implement queue selector de han che lap lai tu da hoc trong cung session va bo qua tu chua den han.

## Pha 2 - UI and study flow
- [x] Dashboard co lich hoc theo ngay (calendar marker).
- [x] Dashboard thong ke 4 nhom: Da thuoc, Chua thuoc, Kho nho, Tu moi.
- [x] Learning screen co 6 level HSK1 -> HSK6.
- [x] Bo import runtime, seed du lieu hardcoded 1 lan luc khoi dong.
- [x] Flashcard screen co flip card de xem nghia, pinyin, vi du.
- [x] Co 3 nut Tick / ? / X map sang quality 5 / 3 / 1 theo SM-2.

## Pha 3 - Android operations
- [x] Local notification nhac hoc 8:00 moi ngay.
- [x] Android manifest them permission can thiet cho notification.
- [x] Co script chay nhanh khi bat USB debugging (`scripts/run_usb_debug.sh`, `scripts/run_usb_debug.bat`).

## Pha 4 - Hardcoded workflow polishing
- [x] Don schema DB, bo bang `import_progress` khong con su dung.
- [x] Them script regen data hardcoded + verify (`scripts/regen_vocab_and_test.sh`, `scripts/regen_vocab_and_test.bat`).

## Pha 5 - Performance and cache
- [x] Seed hardcoded data theo batch chunk (mac dinh 400 ban ghi/chunk) de mo app lan dau muot hon.
- [x] Hien tien do seed trong luc bootstrap (loading progress).
- [x] Them cache flashcard theo level trong memory de next card nhanh hon, giam truy van DB lap lai.
- [x] Update cache state ngay sau khi review de du lieu hien thi lien tuc va dong bo voi DB.

## Test da them
- [x] `test/sm2_scheduler_test.dart`
- [x] `test/queue_selector_test.dart`
- [x] `test/hardcoded_vocab_data_test.dart`
- [x] `test/chunking_test.dart`
- [x] `test/study_card_cache_test.dart`

## Luu y
- App seed toan bo du lieu hardcoded (5002 tu) vao local DB neu lan dau mo app.
