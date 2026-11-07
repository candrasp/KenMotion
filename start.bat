@echo off
title KenMotion Studio
cd /d "%~dp0"

if not exist "apps\web\dist" (
    echo [KenMotion] Menyiapkan bundle produksi pertama kali...
    call bun run build
)

echo [KenMotion] Membuka antarmuka studio di browser...
start http://127.0.0.1:3031

echo [KenMotion] Server aktif di http://127.0.0.1:3031
bun run start

