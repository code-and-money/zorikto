import { afterAll, beforeAll, expect, test } from "bun:test";
import { CONNECTION_ERROR, Zorikto } from "../lib/zorikto";
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

test("changes the headers", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}`, headers: { "X-I-LOVE-BUN": "Hello, Bun!" } });

  try {
    const result = await client.get("/number/200");
    expect(result.body).toStrictEqual(MOCK);

    // change the url
    const nextUrl = `http://127.0.0.1:${port}`;
    client.setBaseUrl(nextUrl);
    expect(client.getBaseUrl()).toBe(new URL(nextUrl).toString());

    const result2 = await client.get("/number/200");
    expect(result2.body).toStrictEqual(MOCK);

    await server.stop();

    // and try connecting back to the original one
    client.setBaseUrl(`http://BAD.localhost:${port}`);
    const result3 = await client.get("/number/200");
    expect(result3.issue).toBe(CONNECTION_ERROR);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
