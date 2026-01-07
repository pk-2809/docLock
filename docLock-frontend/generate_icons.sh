#!/bin/bash
SOURCE="src/assets/logo.png"
OUT_DIR="public/icons"
ROOT_OUT="public"

# Ensure output dir exists
mkdir -p "$OUT_DIR"

# PWA Icons
sips -z 72 72   "$SOURCE" --out "$OUT_DIR/icon-72x72.png"
sips -z 96 96   "$SOURCE" --out "$OUT_DIR/icon-96x96.png"
sips -z 128 128 "$SOURCE" --out "$OUT_DIR/icon-128x128.png"
sips -z 144 144 "$SOURCE" --out "$OUT_DIR/icon-144x144.png"
sips -z 152 152 "$SOURCE" --out "$OUT_DIR/icon-152x152.png"
sips -z 192 192 "$SOURCE" --out "$OUT_DIR/icon-192x192.png"
sips -z 384 384 "$SOURCE" --out "$OUT_DIR/icon-384x384.png"
sips -z 512 512 "$SOURCE" --out "$OUT_DIR/icon-512x512.png"

# Favicons
sips -z 32 32   "$SOURCE" --out "$ROOT_OUT/favicon.png"
sips -z 180 180 "$SOURCE" --out "$ROOT_OUT/apple-touch-icon.png"

# Attempt ICO (or copy)
# sips might not write ico, so we copy png to ico (browsers handle this fine)
cp "$ROOT_OUT/favicon.png" "$ROOT_OUT/favicon.ico"
