import { afterAll, beforeAll, expect, test } from "bun:test";
import { NONE } from "../src/zorikto";
import { createServer, getFreePort } from "./fixture/server";
import { Zorikto } from "../src/zorikto";

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

  await client
    .get("/echo", { query: "Hello, Bun!" })
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: "Hello, Bun!" });
      expect(response.body).toStrictEqual({ echo: "Hello, Bun!" });
    })
    .catch(done)
    .finally(done);
});

test("POST supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .post("/echo", null, { searchParams: { query: "Hello, Bun!" } })
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: "Hello, Bun!" });
    })
    .catch(done)
    .finally(done);
});

test("PATCH supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .patch("/echo", null, { searchParams: { query: "Hello, Bun!" } })
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: "Hello, Bun!" });
    })
    .catch(done)
    .finally(done);
});

test("PUT supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .put("/echo", null, { searchParams: { query: "Hello, Bun!" } })
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: "Hello, Bun!" });
    })
    .catch(done)
    .finally(done);
});

test("DELETE supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .delete("/echo", { query: "Hello, Bun!" })
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: "Hello, Bun!" });
    })
    .catch(done)
    .finally(done);
});

test("LINK supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .link("/echo", { query: "Hello, Bun!" })
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: "Hello, Bun!" });
    })
    .catch(done)
    .finally(done);
});

test("UNLINK supports searchParams", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .unlink("/echo", { query: "Hello, Bun!" })
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: "Hello, Bun!" });
    })
    .catch(done)
    .finally(done);
});

test("Empty searchParams are supported", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .get("/echo", {})
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: null });
    })
    .catch(done)
    .finally(done);
});

test("Null searchParams are supported", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .get("/echo", null)
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: null });
    })
    .catch(done)
    .finally(done);
});

test("Undefined searchParams are supported", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .get("/echo")
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: null });
    })
    .catch(done)
    .finally(done);
});

test("Undefined parameters should be empty string", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    // @ts-expect-error
    .get("/echo", { query: undefined })
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: "undefined" });
    })
    .catch(done)
    .finally(done);
});

test("Empty parameters should be empty", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  await client
    .get("/echo", { query: "" })
    .then((response) => {
      expect(response.issue).toBe(NONE);
      expect(response.body).toStrictEqual({ echo: "" });
    })
    .catch(done)
    .finally(done);
});
