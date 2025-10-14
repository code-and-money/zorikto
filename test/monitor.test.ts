import { afterAll, beforeAll, expect, vi, test } from "bun:test";
import { Zorikto } from "../lib/zorikto";
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

test("attaches a monitor", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  expect(client.on).toBeFunction();
  expect(client.monitors).toBeTruthy();

  expect(client.monitors.length).toBe(0);
  client.on("monitor", vi.fn());
  expect(client.monitors.length).toBe(1);

  done();
});

test("fires our monitor function", async (done) => {
  let a = 0;
  let b: undefined | number;

  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  client.on("monitor", (_response) => {
    a += 1;
  });
  client.on("monitor", (response) => {
    b = response.status;
  });

  expect(a).toBe(0);
  expect(b).toBeUndefined();

  try {
    await client.get("/number/201").then((result) => {
      expect(result.status).toBe(201);
      expect(a).toBe(1);
      expect(b).toBe(201);
    });

    await client.get("/number/204").then((result) => {
      expect(result.status).toBe(204);
      expect(a).toBe(2);
      expect(b).toBe(204);
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("ignores exceptions raised inside monitors", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  client.on("monitor", () => {
    throw new Error("Just Throw!");
  });

  expect(() => client.get("/number/201")).not.toThrow();

  done();
});
