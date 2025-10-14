import { afterAll, beforeAll, expect, test } from "bun:test";
import { createServer, getFreePort } from "./fixture/server";
import { ABORT_ERROR, ZoriktoError } from "../lib/zorikto";
import { Zorikto } from "../lib/zorikto";

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

test("abort request", async (done) => {
  const controller = new AbortController();

  const client = new Zorikto({ baseUrl: `http://localhost:${port}`, signal: controller.signal, timeout: 200 });

  setTimeout(() => {
    controller.abort("test");
  }, 20);

  try {
    const result = await client.get("/sleep/150");
    expect(result.ok).toBe(false);
    expect(result.originalError).toBeInstanceOf(ZoriktoError);
    expect(result.issue).toBe(ABORT_ERROR);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
