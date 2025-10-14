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

test.each(["post", "put", "patch"] as const)("%s has proper data", async (method, done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client[method]("/post", { body: MOCK });

    expect(result.status).toBe(200);
    expect(result.body).toStrictEqual(MOCK);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
