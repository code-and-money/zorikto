import { afterAll, beforeAll, expect, test } from "bun:test";
import { Zorikto } from "../src/zorikto";
import { createServer, getFreePort } from "./fixture/server";

let port: number;
let server = null as any as Bun.Server<undefined>;

const MOCK = { a: { b: [3, 2, 1] } };

beforeAll(async (done) => {
  port = await getFreePort();
  server = await createServer(port, MOCK);
  done();
});

afterAll((done) => {
  server.stop();
  done();
});

test("can be used with async/await", async (done) => {
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
