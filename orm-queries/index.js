const express = require("express");
const app = express();
const generateShortCode = require("./shortCode.js");
const { sequelize, UrlShortner } = require("./db.js");
const port = 3000;

require("./initialise.js");

app.use(express.json());

app.post("/shorten", async (req, res) => {
  const inputUrl = req.body.url;

  try {
    const existingShortCode = await UrlShortner.findOne({
      where: { original_url: inputUrl },
    });

    if (existingShortCode) {
      return res.json({ short_code: existingShortCode.short_code });
    }

    let generatedShortCode = generateShortCode();

    try {
      await UrlShortner.create({
        original_url: inputUrl,
        short_code: generatedShortCode
      })
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        generatedShortCode = generateShortCode();
        await UrlShortner.create({
          original_url: inputUrl,
          short_code: generatedShortCode
        })
      } else {
        throw err;
      }
    }
    res.json({ short_code: generatedShortCode });
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

  try {
    const rowData = await UrlShortner.findOne({
      where: { short_code: shortCode },
    });
    if (!rowData) {
      return res.status(404).json({ error: "Short code not found" });
    }
    return res.status(200).json({ url: rowData.original_url });
  } catch (error) {
    req.status(500).json({ error: "Database Error" });
  }
});

app.delete("/shorten/:code", async (req, res) => {
  const { code } = req.params;

  if (!code || code.trim() === "") {
    return res.status(400).json({ error: "Short code is required" });
  }

  try {
    const deletedCount = await UrlShortner.destroy({ where: { short_code: code } });

    if (deletedCount === 0) {
      return res.status(404).json({ error: "Short code not found" });
    }

    return res.status(200).json({ message: "Short code deleted successfully" });
  } catch (err) {
    console.error("Delete failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


app.listen(port, () => {
  console.log(`🚀 App running on port ${port}`);
});

module.exports = app;
