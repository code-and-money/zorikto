import { afterAll, beforeAll, expect, test } from "bun:test";
import { CLIENT_ERROR, NONE, SERVER_ERROR } from "../lib/zorikto";
import { createServer, getFreePort } from "./fixture/server";
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

test("reads the status code for 200s", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/number/201");

    expect(result.status).toBe(201);
    expect(result.issue).toBe(NONE);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("reads the status code for 400s", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/number/401");

    expect(result.status).toBe(401);
    expect(result.issue).toBe(CLIENT_ERROR);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("reads the status code for 500s", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/number/501");

    expect(result.status).toBe(501);
    expect(result.issue).toBe(SERVER_ERROR);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
