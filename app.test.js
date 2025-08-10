const request = require("supertest");
const app = require("./index.js");
const db = require("./sqlite.js");

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
});

afterAll(async () => {
  await new Promise((resolve) => db.close(resolve));
});
