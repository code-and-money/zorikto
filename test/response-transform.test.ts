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

test("attaches a response transform", async (_done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  expect(client.on).toBeFunction();
  expect(client.responseTransformers).toBeArray();

  expect(client.responseTransformers.length).toBe(0);

  client.on("response", (_response) => {});
  expect(client.responseTransformers.length).toBe(1);

  client.on("response", async (_response) => Promise.resolve());
  expect(client.responseTransformers.length).toBe(2);
});

test("alters the response", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });
  const BODY_OVERWRITE = { a: "hi" };

  let count = 0;

  client.on("response", (ctx) => {
    count++;
    ctx.body = BODY_OVERWRITE;
  });

  expect(count).toBe(0);

  try {
    const result = await client.get("/number/201");

    expect(result.status).toBe(201);
    expect(count).toBe(1);
    expect(result.body).toStrictEqual(BODY_OVERWRITE);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("swap out data on response", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });
  const BODY_OVERWRITE = { a: { some: { other: "stuff" } } };

  let count = 0;

  client.on("response", (response) => {
    count++;
    response.status = 222;
    response.body = BODY_OVERWRITE;
  });

  expect(count).toBe(0);

  try {
    const result = await client.get("/number/201");

    expect(result.status).toBe(222);
    expect(count).toBe(1);
    expect(result.body).toStrictEqual(BODY_OVERWRITE);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("alters the response", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });
  const BODY_OVERWRITE = { a: "hi" };

  let count = 0;

  client.on("response", (ctx) => {
    count++;
    ctx.body = BODY_OVERWRITE;
  });

  client.on("response", (response) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        count++;
        response.body = BODY_OVERWRITE;
        resolve();
      });
    });
  });

  expect(count).toBe(0);

  try {
    const result = await client.get("/number/201");

    expect(result.status).toBe(201);
    expect(count).toBe(2);
    expect(result.body).toStrictEqual(BODY_OVERWRITE);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("swap out data on response", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });
  const BODY_OVERWRITE = { a: { some: { other: "stuff" } } };

  let count = 0;

  client.on("response", (response) => {
    count++;
    response.status = 222;
    response.body = BODY_OVERWRITE;
  });

  client.on("response", (response) => {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        count++;
        response.status = 222;
        response.body = BODY_OVERWRITE;
        resolve();
      });
    });
  });

  expect(count).toBe(0);

  try {
    const result = await client.get("/number/201");

    expect(result.status).toBe(222);
    expect(count).toBe(2);
    expect(result.body).toStrictEqual(BODY_OVERWRITE);
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
