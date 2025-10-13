import { afterAll, beforeAll, expect, test } from "bun:test";
import { TIMEOUT_ERROR, Zorikto } from "../src/zorikto";
import { createServer, getFreePort } from "./fixture/server";

let port: number;
let server = null as any as Bun.Server<undefined>;

beforeAll(async (done) => {
  port = await getFreePort();
  server = await createServer(port);
  done();
});

afterAll((done) => {
  server.stop();
  done();
});

test("times out", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}`, timeout: 100 });

  try {
    await client.get("/sleep/150").then((response) => {
      expect(response.ok).toBeFalse();
      expect(response.issue).toBe(TIMEOUT_ERROR);
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
