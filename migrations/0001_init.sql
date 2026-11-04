CREATE TABLE IF NOT EXISTS folders (
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, name)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  folder TEXT,
  favorite INTEGER NOT NULL DEFAULT 0,
  added_date TEXT,
  last_opened INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_folders_user_sort ON folders(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_sort ON bookmarks(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_folder ON bookmarks(user_id, folder, sort_order);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_favorite ON bookmarks(user_id, favorite);
