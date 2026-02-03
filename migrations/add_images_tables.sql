-- Migration: Add image management tables
-- Run: npx wrangler d1 execute DB --local --config wrangler.fresh.jsonc --file=migrations/add_images_tables.sql

-- Folder untuk organisasi gambar
CREATE TABLE IF NOT EXISTS image_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Gambar yang diupload ke R2
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL UNIQUE,
    size_bytes INTEGER,
    mime_type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES image_folders(id) ON DELETE SET NULL
);

-- Index untuk query performa
CREATE INDEX IF NOT EXISTS idx_images_folder ON images(folder_id);
CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC);

-- Default folder
INSERT OR IGNORE INTO image_folders (id, name) VALUES (1, 'Umum');
