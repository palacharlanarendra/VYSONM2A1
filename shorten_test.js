import http from "k6/http";
import { sleep } from "k6";

export let options = {
  vus: 8000,
  duration: "5s",
  thresholds: {
    http_req_duration: ["p(50)<200", "p(90)<400", "p(95)<600", "p(99)<800"],
  },
};

export default function () {
  let url = "http://localhost:3000/shorten";
  let payload = JSON.stringify({ url: "https://example.com" });
  let params = { headers: { "Content-Type": "application/json" } };
  http.post(url, payload, params);
  sleep(1);
}
