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

test("has valid data with a 200", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const response = await client.get("/number/200", { a: "b" });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(MOCK);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("has valid data with a 400s", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const response = await client.get("/number/404");

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual(null);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("has valid data with a 500s", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const response = await client.get("/number/500");

    expect(response.status).toBe(500);
    expect(response.body).toStrictEqual(null);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("Falsy data is preserved", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const response = await client.get("/false");
    expect(response.body).toBe(false);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
