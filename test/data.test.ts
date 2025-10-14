import { afterAll, beforeAll, expect, test } from "bun:test";
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

test("has valid data with a 200", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get<typeof MOCK>("/number/200", { body: { a: "b" } });

    expect(result.status).toBe(200);
    expect(result.body).toStrictEqual(MOCK);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("has valid data with a 400s", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/number/404");

    expect(result.status).toBe(404);
    expect(result.body).toStrictEqual(null);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("has valid data with a 500s", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/number/500");

    expect(result.status).toBe(500);
    expect(result.body).toStrictEqual(null);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("Falsy data is preserved", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/false");
    expect(result.body).toBe(false);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
