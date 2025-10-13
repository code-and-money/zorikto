import { afterAll, beforeAll, expect, test } from "bun:test";
import { CLIENT_ERROR, NONE, SERVER_ERROR } from "../src/zorikto";
import { createServer, getFreePort } from "./fixture/server";
import { Zorikto } from "../src/zorikto";

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

  await client
    .get("/number/201")
    .then((response) => {
      expect(response.status).toBe(201);
      expect(response.issue).toBe(NONE);
    })
    .catch(done)
    .finally(done);
});

test("reads the status code for 400s", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .get("/number/401")
    .then((response) => {
      expect(response.status).toBe(401);
      expect(response.issue).toBe(CLIENT_ERROR);
    })
    .catch(done)
    .finally(done);
});

test("reads the status code for 500s", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .get("/number/501")
    .then((response) => {
      expect(response.status).toBe(501);
      expect(response.issue).toBe(SERVER_ERROR);
    })
    .catch(done)
    .finally(done);
});
