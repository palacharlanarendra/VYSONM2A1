const express = require("express");
const app = express();
const generateShortCode = require("./shortCode.js");
const { sequelize, UrlShortner, User } = require("./db.js");
const port = 3000;

require("./initialise.js");

app.use(express.json());

app.post("/shorten", async (req, res) => {
  const inputUrl = req.body.url;
  const expiryDate = req.body.expiry_date;
  const customCode = req.body.custom_code;
  const api_key = req.headers.api_key;
  const password = req.body.password;

  if (customCode) {
    const exists = await UrlShortner.findOne({
      where: { short_code: customCode },
    });
    if (exists) {
      return res.status(400).json({ error: "Custom code is already taken!" });
    }
  }
  if (!api_key) {
    return res.status(400).json({ error: "API key is not provided!" });
  }
  const userData = await User.findOne({
    where: { api_key },
  });
  if (!userData) {
    return res.status(400).json({ error: "No such user existed!" });
  }
  if (!inputUrl || inputUrl.trim() === "") {
    return res.status(400).json({ error: "Input URI cannot be empty!" });
  }

  let generatedShortCode = customCode || generateShortCode();

  try {
    const newUrl = await UrlShortner.create({
      original_url: inputUrl,
      short_code: generatedShortCode,
      user_id: userData.id,
      expiry_date: expiryDate ? new Date(expiryDate) : null,
      password: password || null
    });
    return res.status(200).json({
      short_code: newUrl.short_code,
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      generatedShortCode = generateShortCode();
      const newUrl = await UrlShortner.create({
        original_url: inputUrl,
        short_code: generatedShortCode,
        user_id: userData.id,
        expiry_date: expiryDate ? new Date(expiryDate) : null,
        password: password || null
      });
      return res.status(200).json({
        short_code: newUrl.short_code,
      });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post("/updateExpiryDate/:code", async (req, res) => {
  const expiryDate = req.body.expiry_date;
  const { code } = req.params;
  if (!code) {
    return res.statusCode(400).send({error: 'Short code is not provided'})
  }
  if (!expiryDate) {
    return res.statusCode(400).send({error: 'expiry date is not provided'})
  }
  const rowData = await UrlShortner.findOne({
    where: { short_code: code },
  });
  if (!rowData) {
    return res.status(404).json({ error: "Short code not found" });
  }
  try {
    await UrlShortner.update(
      {
        expiry_date: new Date(expiryDate),
      },
      { where: { short_code: code } }
    );
    return res.status(200).json({
      message: "Expiry date updated successfully",
      short_code: code,
      expiry_date: expiryDate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/redirect", async (req, res) => {
  const shortCode = req.query.code;
  const password = req.query.password;
  
  if (!shortCode) {
    return res.status(400).json({ error: "Short code is required!" });
  }

  try {
    const rowData = await UrlShortner.findOne({
      where: { short_code: shortCode },
    });
    if (rowData && rowData.password) {
      if (!password) {
        return res.status(400).json({ error: "Password required" });
      }
      if (password !== rowData.password) {
        return res.status(401).json({ error: "Invalid password" });
      }
    }
    if (!rowData) {
      return res.status(404).json({ error: "Short code not found" });
    }
    if (rowData.expiry_date && Date.now() > rowData.expiry_date) {
      return res.status(410).json({ error: "Short code is expired!" });
    }
    if (rowData) {
      await rowData.update({
        click_count: Number(rowData.click_count) + 1,
        last_accessed_at: new Date(),
      });
    }
    return res.status(200).json({ url: rowData.original_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/shortenedUrls", async (req, res) => {
  const api_key = req.headers.api_key;

  if (!api_key) {
    return res.status(400).json({ error: "API key is required!" });
  }

  const userData = await User.findOne({ where: { api_key } });
  if (!userData) {
    return res.status(404).json({ error: "User not found!" });
  }

  const urls = await UrlShortner.findAll({
    where: { user_id: userData.id },
    attributes: [
      "id",
      "original_url",
      "short_code",
      "expiry_date",
      "createdAt",
      "updatedAt",
      "click_count",
    ],
    order: [["createdAt", "DESC"]],
  });

  return res.json({ urls });
});

app.delete("/shorten/:code", async (req, res) => {
  const { code } = req.params;
  const { api_key } = req.headers;

  if (!api_key) {
    return res.status(400).json({ error: "API key is not provided!" });
  }

  const userData = await User.findOne({
    where: { api_key },
  });
  if (!userData) {
    return res.status(404).json({ error: "User not found!" });
  }

  if (!code || code.trim() === "") {
    return res.status(400).json({ error: "Short code is required" });
  }

  const UrlShortenData = await UrlShortner.findOne({
    where: { short_code: code },
  });

  if (!UrlShortenData) {
    return res.status(404).json({ error: "Short code not found" });
  }

  if (UrlShortenData.user_id != userData.id) {
    return res.status(400).json({ error: "user cant delete this url" });
  }

  try {
    const deletedCount = await UrlShortner.update(
      { isDeleted: true },
      { where: { short_code: code } }
    );

    if (deletedCount.length === 0) {
      return res.status(404).json({ error: "Short code not found" });
    }

    return res.status(200).json({ message: "Short code deleted successfully" });
  } catch (err) {
    console.error("Delete failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/shorten/bulk", async (req, res) => {
  const inputData = req.body.original_data;
  const api_key = req.headers.api_key;

  if (!Array.isArray(inputData) || inputData.length === 0) {
    return res.status(400).json({ error: "No input array provided" });
  }

  if (!api_key) {
    return res.status(400).json({ error: "API key is not provided!" });
  }

  const user = await User.findOne({ where: { api_key } });
  if (!user) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  if(user.tier != "enterprise") {
    return res.status(403).json({ error: "You need to upgrade to enterprise tier" });
  }

  const results = await Promise.all(
    inputData.map(async (data) => {
      try {
        if (!data.url || data.url.trim() === "") {
          return { error: "Input URI cannot be empty!" };
        }

        if (data.custom_code) {
          const exists = await UrlShortner.findOne({
            where: { short_code: data.custom_code },
          });
          if (exists) {
            return { error: `Custom code '${data.custom_code}' is already taken!` };
          }
        }

        let generatedShortCode = data.custom_code || generateShortCode();

        let newUrl;
        try {
          newUrl = await UrlShortner.create({
            original_url: data.url,
            short_code: generatedShortCode,
            user_id: user.id,
            expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
          });
        } catch (err) {
          if (err.name === "SequelizeUniqueConstraintError") {
            generatedShortCode = generateShortCode();
            newUrl = await UrlShortner.create({
              original_url: data.url,
              short_code: generatedShortCode,
              user_id: user.id,
              expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
            });
          } else {
            return { error: err.message };
          }
        }

        return {
          url: data.url,
          short_code: newUrl.short_code,
        };
      } catch (err) {
        return { error: err.message };
      }
    })
  );

  return res.status(207).json({ results });
});

app.listen(port, () => {
  console.log(`🚀 App running on port ${port}`);
});

module.exports = app;
