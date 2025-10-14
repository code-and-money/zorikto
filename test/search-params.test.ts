import { afterAll, beforeAll, expect, test } from "bun:test";
import { NONE } from "../lib/zorikto";
import { createServer, getFreePort } from "./fixture/server";
import { Zorikto } from "../lib/zorikto";

let port: number;
let server = null as any as Bun.Server<undefined>;

afterAll((done) => {
  server.stop();
  done();
});

beforeAll(async (done) => {
  port = await getFreePort();
  server = await createServer(port);
  done();
});

test("GET supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/echo", { searchParams: { query: "Hello, Bun!" } });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: "Hello, Bun!" });
    expect(result.body).toStrictEqual({ echo: "Hello, Bun!" });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("POST supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.post("/echo", { searchParams: { query: "Hello, Bun!" } });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: "Hello, Bun!" });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("PATCH supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.patch("/echo", { searchParams: { query: "Hello, Bun!" } });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: "Hello, Bun!" });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("PUT supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.put("/echo", { searchParams: { query: "Hello, Bun!" } });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: "Hello, Bun!" });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("DELETE supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.delete("/echo", { searchParams: { query: "Hello, Bun!" } });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: "Hello, Bun!" });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("LINK supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.link("/echo", { searchParams: { query: "Hello, Bun!" } });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: "Hello, Bun!" });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("UNLINK supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.unlink("/echo", { searchParams: { query: "Hello, Bun!" } });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: "Hello, Bun!" });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("Empty searchParams are supported", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/echo", { searchParams: {} });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: null });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("Null searchParams are supported", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    // @ts-expect-error
    const result = await client.get("/echo", { searchParams: null });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: null });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("Undefined searchParams are supported", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/echo");

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: null });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("Undefined parameters should be empty string", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    // @ts-expect-error
    const result = await client.get("/echo", { searchParams: { query: undefined } });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: "undefined" });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("Empty parameters should be empty", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    const result = await client.get("/echo", { searchParams: { query: "" } });

    expect(result.issue).toBe(NONE);
    expect(result.body).toStrictEqual({ echo: "" });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
