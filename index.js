const express = require("express");
const app = express();
const generateShortCode = require("./shortCode.js");
const db = require('./sqlite.js');
const port = 3000;

require("./initialise.js");

app.use(express.json());

app.post("/shorten", (req, res) => {
  const inputUrl = req.body.url;
  const shortCode = generateShortCode();

  db.run(
    "INSERT INTO url_shortner (short_code, original_url) VALUES (?,?)",
    [shortCode, inputUrl],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to shorten URL" });
      }
      res.json({ shortCode });
    }
  );
});

app.listen(port, () => {
  console.log(`🚀 App running on port ${port}`);
});
