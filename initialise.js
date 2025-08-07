const db = require('./sqlite.js');

const createTable = `CREATE TABLE IF NOT EXISTS url_shortner(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code VARCHAR(255) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;


db.serialize(() => {
  db.run(createTable)
})