const db = require('./sqlite.js');

function generateShortCode(length = 6) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let shortCode = "";
  for (let i = 0; i < length; i++) {
    shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (!shortCodeExists(shortCode)) {
    return shortCode;
  } else {
    return generateShortCode();
  }
}

function shortCodeExists(shortCode) {
    db.run('SELECT * FROM url_shortner WHERE short_code=? LIMIT 1',[shortCode],(err, row) => {
        if (err) {
            return err.message;
        } else if(row) {
            return true;
        } else {
            return false;
        }
    })
}

module.exports = generateShortCode;