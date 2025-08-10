const express = require("express");
const app = express();
const generateShortCode = require("./shortCode.js");
const db = require("./sqlite.js");
const port = 3000;

require("./initialise.js");

app.use(express.json());

function insertShortCode(url, shortCode) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO url_shortner (original_url, short_code) VALUES (?,?)",
      [url, shortCode],
      function (err, row) {
        if (err) return reject(err);
        if (row) resolve(shortCode);
      }
    );
  });
}

function getTheShortCode(url) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM url_shortner WHERE original_url=? LIMIT 1",
      [url],
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(row.short_code);
        return resolve(null);
      }
    );
  });
}
app.post("/shorten", async (req, res) => {
  const inputUrl = req.body.url;

  try {
    const existingShortCode = await getTheShortCode(inputUrl);

    if (existingShortCode) {
      return res.json({ short_code: existingShortCode });
    }

    let generatedShortCode = generateShortCode();

    try {
      await insertShortCode(inputUrl, generatedShortCode);
    } catch (err) {
      if (err.code === "SQLITE_CONSTRAINT") {
        generatedShortCode = generateShortCode();
        await insertShortCode(inputUrl, generatedShortCode);
      } else {
        throw err;
      }
    }
    res.json({ shortCode: generatedShortCode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/redirect", async (req, res) => {
  const shortCode = req.query.code;
  if (!shortCode) {
    return res.status(400).json({ error: "Short code is required" });
  }
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM url_shortner WHERE short_code=? LIMIT 1",
      [shortCode],
      (err, row) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Database error" });
        }
        if (!row) {
          return res.status(404).json({ error: "Short code not found" });
        }
        if (row) return res.status(200).json({ url: row.original_url });
      }
    );
  });
});

app.listen(port, () => {
  console.log(`🚀 App running on port ${port}`);
});

module.exports = app;