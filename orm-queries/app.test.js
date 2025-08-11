const request = require("supertest");
const app = require("./index.js");
const { sequelize } = require("./db.js");

describe("API Integration Tests", () => {
  it("should shorten a URL and redirect", async () => {
    const response = await request(app)
      .post("/shorten")
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
  it("duplicate URL", async () => {
    const response = await request(app)
      .post("/shorten")
      .send({ url: "https://example2.com/" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("short_code");
    expect(response.body.short_code.length).toBe(6);
    const shortCode = response.body.short_code;

    const response2 = await request(app)
      .post("/shorten")
      .send({ url: "https://example2.com/" });
    expect(response2.statusCode).toBe(200);
    expect(response2.body).toHaveProperty("short_code");
    expect(response2.body.short_code.length).toBe(6);
    const shortCode2 = response2.body.short_code;

    expect(shortCode).toEqual(shortCode2);
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
      "Short code is required"
    );
  });
  it("should return 404 when no such endpoint", async () => {
    const response = await request(app).get("/test404");
    expect(response.statusCode).toBe(404);
  });
  it("delete shorten URL", async () => {
    const response = await request(app)
      .post("/shorten")
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

    const deleteResponse = await request(app).delete(`/shorten/${shortCode}`);
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body).toHaveProperty("message", "Short code deleted successfully");
  });
});

afterAll(async () => {
  await sequelize.close();
});
