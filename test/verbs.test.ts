import { afterAll, beforeAll, expect, test } from "bun:test";
import { Zorikto } from "../src/zorikto";
import { createServer, getFreePort } from "./fixture/server";

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

test("supports all verbs", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  expect(client.get).toBeTruthy();
  expect(client.post).toBeTruthy();
  expect(client.patch).toBeTruthy();
  expect(client.put).toBeTruthy();
  expect(client.head).toBeTruthy();
  expect(client.delete).toBeTruthy();
  expect(client.link).toBeTruthy();
  expect(client.unlink).toBeTruthy();

  done();
});

test("can make a get", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    await client.get("/ok").then((result) => {
      expect(result.ok).toBeTruthy();
      expect(result.options?.method).toBe("get");
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("can make a post", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    await client.post("/ok").then((result) => {
      expect(result.ok).toBeTruthy();
      expect(result.options?.method).toBe("post");
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("can make a patch", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    await client.patch("/ok").then((result) => {
      expect(result.ok).toBeTruthy();
      expect(result.options?.method).toBe("patch");
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("can make a put", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    await client.put("/ok").then((result) => {
      expect(result.ok).toBeTruthy();
      expect(result.options?.method).toBe("put");
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("can make a delete", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    await client.delete("/ok").then((result) => {
      expect(result.ok).toBeTruthy();
      expect(result.options?.method).toBe("delete");
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("can make a head", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    await client.head("/ok").then((result) => {
      expect(result.ok).toBeTruthy();
      expect(result.options?.method).toBe("head");
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("can make a link", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    await client.link("/ok").then((result) => {
      expect(result.ok).toBeTruthy();
      expect(result.options?.method).toBe("link");
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});

test("can make a unlink", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${port}` });

  try {
    await client.unlink("/ok").then((result) => {
      expect(result.ok).toBeTruthy();
      expect(result.options?.method).toBe("unlink");
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
