const request = require("supertest");
const app = require("./index.js");
const { sequelize, User, UrlShortner } = require("./db.js");

describe("API Integration Tests", () => {
  let user;

  beforeAll(async () => {
    // sync db in test mode
    await sequelize.sync({ force: true });

    // create a dummy user with api_key
    user = await User.create({
      email: "testuser@gmail.com",
      name: "testuser",
      api_key: "abc123xyz",
      tier: "enterprise",
    });
  });

  it("should shorten a URL and redirect", async () => {
    const response = await request(app)
      .post("/shorten")
      .set("Content-Type", "application/json")
      .set("api_key", "abc123xyz")
      .send({ url: "https://example.com/" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("short_code");
    expect(response.body.short_code.length).toBe(6);
    const shortCode = response.body.short_code;

    const redirectResponse = await request(app)
      .get("/redirect")
      .query({ code: shortCode });
    expect(redirectResponse.statusCode).toBe(200);
    expect(redirectResponse.body).toHaveProperty("url", "https://example.com/");
  });
  it("should shorten a URL and redirect with correct password", async () => {
    const response = await request(app)
      .post("/shorten")
      .set("api_key", "abc123xyz")
      .send({ url: "https://example.com/", password: "secret123" });
    
    const shortCode = response.body.short_code;
  
    const redirectResponse = await request(app)
      .get("/redirect")
      .set("api_key", "abc123xyz")
      .query({ code: shortCode, password: "secret123" });

    expect(redirectResponse.statusCode).toBe(200);
    expect(redirectResponse.body).toHaveProperty("url", "https://example.com/");
  });
  it("should shorten a URL and redirect with wrong password", async () => {
    const response = await request(app)
      .post("/shorten")
      .set("api_key", "abc123xyz")
      .send({ url: "https://example.com/", password: "secret123" });
    
    const shortCode = response.body.short_code;
  
    const redirectResponse = await request(app)
      .get("/redirect")
      .set("api_key", "abc123xyz")
      .query({ code: shortCode, password: "secret12223" });

    expect(redirectResponse.statusCode).toBe(401);
    expect(redirectResponse.body).toHaveProperty("error", );
  });
  it("empty URL", async () => {
    const response = await request(app)
      .post("/shorten")
      .set("Content-Type", "application/json")
      .set("api_key", "abc123xyz")
      .send({ url: "" });
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("error", "Input URI cannot be empty!");
  });
  it("Short code not existed", async () => {
    const shortCode = "YYYYYY";
    const redirectResponse = await request(app)
      .get("/redirect")
      .query({ code: shortCode });
    expect(redirectResponse.statusCode).toBe(404);
    expect(redirectResponse.body).toHaveProperty(
      "error",
      "Short code not found"
    );
  });
  it("Short code is required", async () => {
    const shortCode = "";
    const redirectResponse = await request(app)
      .get("/redirect")
      .query({ code: shortCode });
    expect(redirectResponse.statusCode).toBe(400);
    expect(redirectResponse.body).toHaveProperty(
      "error",
      "Short code is required!"
    );
  });
  it("should return 404 when no such endpoint", async () => {
    const response = await request(app).get("/test404");
    expect(response.statusCode).toBe(404);
  });
  it("should return error if short code is expired", async () => {
    const shortnedURL = await request(app)
      .post("/shorten")
      .set("Content-Type", "application/json")
      .set("api_key", "abc123xyz")
      .send({
        url: "https://example.com",
        expiry_date: "2025-07-30T12:54:11.847Z",
      });
    const response = await request(app)
      .get("/redirect")
      .query({ code: shortnedURL.body.short_code });

    expect(response.statusCode).toBe(410);
    expect(response.body).toHaveProperty("error", "Short code is expired!");
  });
  it("should shorten for custom code", async () => {
    const custom_code = "examplecomcode";
    await request(app)
      .post("/shorten")
      .set("Content-Type", "application/json")
      .set("api_key", "abc123xyz")
      .send({
        url: "https://example.com",
        custom_code: custom_code,
      });
    const response = await request(app)
      .get("/redirect")
      .query({ code: custom_code });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("url", "https://example.com");
  });
  it("delete shorten URL", async () => {
    const response = await request(app)
      .post("/shorten")
      .set("Content-Type", "application/json")
      .set("api_key", "abc123xyz")
      .send({ url: "https://example.com/" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("short_code");
    expect(response.body.short_code.length).toBe(6);
    const shortCode = response.body.short_code;

    const redirectResponse = await request(app)
      .get("/redirect")
      .query({ code: shortCode });
    expect(redirectResponse.statusCode).toBe(200);
    expect(redirectResponse.body).toHaveProperty("url", "https://example.com/");

    const deleteResponse = await request(app)
      .delete(`/shorten/${shortCode}`)
      .set("api_key", "abc123xyz");
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body).toHaveProperty(
      "message",
      "Short code deleted successfully"
    );
  });
  it("should shorten multiple URLs and return status per item", async () => {
    const payload = {
      original_data: [
        { url: "https://www.example.com", custom_code: "example" },
        { url: "https://www.google.com" },
        { url: "https://www.github.com", custom_code: "git123" },
      ],
    };

    const res = await request(app)
      .post("/shorten/bulk")
      .set("Content-Type", "application/json")
      .set("api_key", "abc123xyz")
      .send(payload);

    expect(res.status).toBe(207);
    expect(res.body).toHaveProperty("results");
    expect(Array.isArray(res.body.results)).toBe(true);

    expect(res.body.results[0]).toHaveProperty("url");
    expect(res.body.results[0]).toHaveProperty("short_code");
  });
  it("should update expiry date successfully", async () => {
    let shortUrl = await UrlShortner.create({
      original_url: "https://example.com",
      short_code: "abc123",
      userId: user.id,
      expiry_date: new Date("2025-01-01"),
    });
    const response = await request(app)
      .post(`/updateExpiryDate/${shortUrl.short_code}`)
      .send({ expiry_date: "2025-06-30T12:54:11.847Z" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Expiry date updated successfully"
    );
    expect(response.body.short_code).toBe("abc123");
    expect(response.body.expiry_date).toBe("2025-06-30T12:54:11.847Z");
  });
});

describe("GET /shortenedUrls", () => {
  let user;
  let apiKey = "testApiKey123";

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    user = await User.create({ name: "testUser", email: "testuser@gmail.com", api_key: apiKey });

    // Insert some shortened URLs
    await UrlShortner.bulkCreate([
      {
        original_url: "https://example1.com",
        short_code: "abc123",
        expiry_date: "2025-12-31",
        user_id: user.id,
        click_count: 10,
      },
      {
        original_url: "https://example2.com",
        short_code: "xyz456",
        expiry_date: "2025-11-30",
        user_id: user.id,
        click_count: 5,
      },
    ]);
  });

  it("should return all shortened URLs for the user with valid API key", async () => {
    const res = await request(app)
      .get("/shortenedUrls")
      .set("api_key", apiKey);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("urls");
    expect(Array.isArray(res.body.urls)).toBe(true);
    expect(res.body.urls.length).toBe(2);
    expect(res.body.urls[0]).toHaveProperty("original_url");
    expect(res.body.urls[0]).toHaveProperty("short_code");
    expect(res.body.urls[0]).toHaveProperty("expiry_date");
    expect(res.body.urls[0]).toHaveProperty("click_count");
  });
});

afterAll(async () => {
  await sequelize.close();
  if (app && app.close) {
    app.close();
  }
});
