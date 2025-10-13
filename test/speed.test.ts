import { afterAll, beforeAll, expect, test } from "bun:test";
import { Zorikto } from "../src/zorikto";
import { createServer, getFreePort } from "./fixture/server";

const MOCK = { a: { b: [3, 2, 1] } };

let port: number;
let server = null as any as Bun.Server<undefined>;

beforeAll(async (done) => {
  port = await getFreePort();
  server = await createServer(port, MOCK);
  done();
});

afterAll((done) => {
  server.stop();
  done();
});

test("has a duration node", async (done) => {
  const SLEEP_TIME = 150;

  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .get(`/sleep/${SLEEP_TIME}`)
    .then((result) => {
      expect(result.status).toBe(200);
      expect(result.duration).toBeNumber();
      expect(result.duration).toBeGreaterThanOrEqual(SLEEP_TIME);
      expect(result.duration).toBeLessThanOrEqual(SLEEP_TIME * 2);
    })
    .catch(done)
    .finally(done);
});
