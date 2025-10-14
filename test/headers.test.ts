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

test("jumps the wire with the right headers", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}`, headers: { "X-I-LOVE-BUN": "Hello, Bun!" } });

  try {
    Object.entries({ "X-I-LOVE-BUN": "foo", jhonny: "hey" }).forEach(([key, value]) => client.headers.set(key, value));

    const result = await client.get("/number/200", { body: { a: "b" } });

    expect(result?.options?.headers?.get("X-I-LOVE-BUN")).toBe("foo");
    expect(result?.options?.headers?.get("jhonny")).toBe("hey");

    client.headers.set("jhonny", "thx");
    const result2 = await client.get("/number/200", {});
    expect(result2.options?.headers?.get("jhonny")).toBe("thx");

    client.headers.delete("jhonny");
    const result3 = await client.get("/number/200", {});
    expect(result3.options?.headers?.get("jhonny")).toBeNull();
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
