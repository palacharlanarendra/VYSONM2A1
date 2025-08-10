import http from "k6/http";
import { sleep } from "k6";

export let options = {
  vus: 16000,
  duration: "5s",
  thresholds: {
    http_req_duration: ["p(50)<200", "p(90)<400", "p(95)<600", "p(99)<800"],
  },
};

export default function () {
  let url = "http://localhost:3000/redirect?code=eca4G8";
  http.get(url);
  sleep(1);
}
