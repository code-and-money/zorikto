import { afterAll, beforeAll, expect, test } from "bun:test";
import { Zorikto } from "../lib/zorikto";
import { createServer, getFreePort } from "./fixture/server";
import { sleep } from "bun";
import assert from "node:assert/strict";

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

test("attaches a request transform", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  expect(client.requestTransformers).toBeArray();
  expect(client.on).toBeFunction();

  expect(client.requestTransformers.length).toBe(0);

  client.on("request", (_ctx) => {});
  expect(client.requestTransformers.length).toBe(1);

  client.on("request", async (_ctx) => Promise.resolve(undefined));
  expect(client.requestTransformers.length).toBe(2);

  done();
});

test("alters the request data", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  let count = 0;
  const BODY_OVERWRITE = { a: "hi" };

  client.on("request", (ctx) => {
    count++;
    ctx.options.body = BODY_OVERWRITE;
  });

  expect(count).toBe(0);

  try {
    {
      const result = await client.post("/post", { body: MOCK });
      expect(result.status).toBe(200);
      expect(count).toBe(1);
      expect(result.body).toStrictEqual(BODY_OVERWRITE);
    }

    client.on(
      "request",
      (ctx) =>
        new Promise((resolve, _reject) => {
          setImmediate(() => {
            count = 69;
            expect(ctx.options.body).toStrictEqual(BODY_OVERWRITE);
            ctx.options.body = MOCK;
            resolve();
          });
        }),
    );

    {
      const result = await client.post("/post", { body: MOCK });
      expect(result.status).toBe(200);
      expect(count).toBe(69);
      expect(result.body).toStrictEqual(MOCK);
    }
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("survives empty PUTs", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  let count = 0;

  client.on("request", () => {
    count++;
  });

  client.on("request", (_ctx) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        count++;
        resolve();
      });
    });
  });

  expect(count).toBe(0);

  try {
    const result = await client.put("/post", { body: {} });

    expect(result.status).toBe(200);
    expect(count).toBe(2);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("fires for gets", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });
  let count = 0;

  client.on("request", (_ctx) => {
    count++;
  });

  client.on("request", (_ctx) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        count++;
        resolve();
      });
    });
  });

  expect(count).toBe(0);

  try {
    const result = await client.get("/number/201");

    expect(result.status).toBe(201);
    expect(count).toBe(2);
    expect(result.body).toStrictEqual(MOCK);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("url can be changed", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  client.on("request", (ctx) => {
    ctx.url = ctx.url.replace("/201", "/200");
  });

  try {
    const result = await client.get("/number/201", { searchParams: { x: 1 } });

    expect(result.status).toBe(200);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("params can be added, edited, and deleted", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });
  client.on("request", (ctx) => {
    ctx.options.searchParams;
    ctx.options.searchParams = new URLSearchParams(ctx.options.searchParams);
    ctx.options.searchParams.set("x", "2");
    ctx.options.searchParams.set("y", "1");
    ctx.options.searchParams.delete("z");
  });

  try {
    const result = await client.get("/number/200", { body: { x: 1, z: 4 } });

    expect(result.status).toBe(200);
    expect(result.options?.searchParams?.get("x")).toBe("2");
    expect(result.options?.searchParams?.get("y")).toBe("1");
    expect(result.options?.searchParams?.get("z")).toBeNull();
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("headers can be created", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  client.on("request", (ctx) => {
    expect(ctx.options.headers).toBeInstanceOf(Headers);
    expect(ctx.options.headers?.get("X-ZORIKTO")).toBeNull();
    ctx.options.headers?.set("X-ZORIKTO", "new");
  });

  try {
    const result = await client.get("/number/201", { searchParams: { x: 1 } });
    expect(result.status).toBe(201);
    expect(result.options?.headers?.get("X-ZORIKTO")).toBe("new");
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("headers from creation time can be changed", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}`, headers: { "X-ZORIKTO": "Hello, Bun!" } });

  client.on("request", (ctx) => {
    expect(ctx.options?.headers?.get("X-ZORIKTO")).toBe("Hello, Bun!");
    expect(ctx.options?.headers?.set("X-ZORIKTO", "change"));
  });

  try {
    const result = await client.get("/number/201", { searchParams: { x: 1 } });
    expect(result.status).toBe(201);
    expect(result.options?.headers?.get("X-ZORIKTO")).toBe("change");
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("headers can be deleted", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}`, headers: { "X-ZORIKTO": "omg" } });

  client.on("request", (ctx) => {
    assert(ctx.options?.headers instanceof Headers);

    expect(ctx.options.headers.get("X-ZORIKTO")).toBe("omg");
    ctx.options.headers.delete("X-ZORIKTO");
    expect(ctx.options.headers.get("X-ZORIKTO")).toBeNull();
  });

  try {
    const result = await client.get("/number/201", { searchParams: { x: 1 } });

    expect(result.status).toBe(201);
    expect(result.options?.headers?.get("X-ZORIKTO")).toBeNull();
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("serial async", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    let fired = false;

    client.on("request", (ctx) => async () => {
      await sleep(500);
      ctx.url = "/number/201";
      fired = true;
    });

    const result = await client.get("/number/200");

    expect(result.ok).toBeTrue();
    expect(result.status).toBe(201);
    expect(fired).toBeTrue();
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("transformers should run serially", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  let first = false;
  let second = false;

  client.on("request", (_ctx) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        expect(second).toBe(false);
        expect(first).toBe(false);
        first = true;
        resolve();
      });
    });
  });

  client.on("request", (_ctx) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        expect(first).toBe(true);
        expect(second).toBe(false);
        second = true;
        resolve();
      });
    });
  });

  try {
    await client.post("/post", { body: MOCK }).then((result) => {
      expect(result.status).toBe(200);
      expect(first).toBe(true);
      expect(second).toBe(true);
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("url can be changed", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  client.on("request", (ctx) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        ctx.url = ctx.url.replace("/201", "/200");
        resolve();
      });
    });
  });

  try {
    const result = await client.get("/number/201", { body: { x: 1 } });
    expect(result.status).toBe(200);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("params can be added, edited, and deleted", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  client.on("request", (ctx) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        ctx.options.searchParams;
        ctx.options.searchParams = new URLSearchParams(ctx.options.searchParams);
        ctx.options.searchParams.set("x", "2");
        ctx.options.searchParams.set("y", "1");
        ctx.options.searchParams.delete("z");
        resolve();
      });
    });
  });

  try {
    const result = await client.get("/number/200", { body: { x: 1, z: 4 } });
    expect(result.status).toBe(200);
    expect(result.options?.searchParams?.get("x")).toBe("2");
    expect(result.options?.searchParams?.get("y")).toBe("1");
    expect(result.options?.searchParams?.get("z")).toBeNull();
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("headers can be created", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  client.on("request", (ctx) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        expect(ctx.options.headers).toBeInstanceOf(Headers);
        expect(ctx.options.headers?.get("X-ZORIKTO")).toBeNull();
        ctx.options.headers?.set("X-ZORIKTO", "new");
        resolve();
      });
    });
  });

  try {
    const result = await client.get("/number/201", { body: { x: 1 } });

    expect(result.status).toBe(201);
    expect(result.options?.headers?.get("X-ZORIKTO")).toBe("new");
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("headers from creation time can be changed", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}`, headers: { "X-ZORIKTO": "Hello, Bun!" } });

  client.on("request", (ctx) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        expect(ctx.options?.headers?.get("X-ZORIKTO")).toBe("Hello, Bun!");
        expect(ctx.options?.headers?.set("X-ZORIKTO", "change"));
        resolve();
      });
    });
  });
  try {
    const result = await client.get("/number/201", { body: { x: 1 } });

    expect(result.status).toBe(201);
    expect(result.options?.headers?.get("X-ZORIKTO")).toBe("change");
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("headers can be deleted", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}`, headers: { "X-ZORIKTO": "omg" } });

  client.on("request", (_ctx) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        client.on("request", (ctx) => {
          expect(ctx.options?.headers?.get("X-ZORIKTO")).toBe("omg");
          ctx.options?.headers?.delete("X-ZORIKTO");
        });
        resolve();
      });
    });
  });

  try {
    const result = await client.get("/number/201", { body: { x: 1 } });

    expect(result.status).toBe(201);
    expect(result.options?.headers?.get("X-ZORIKTO")).toBeNull();
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
