CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  svc TEXT NOT NULL,
  dur INTEGER NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL,          -- pending | confirmed | reschedule
  created_at TEXT NOT NULL,
  review_sent_at TEXT
);
CREATE INDEX IF NOT EXISTS bookings_review ON bookings (status, review_sent_at, end_at);
