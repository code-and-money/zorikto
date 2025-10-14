import { expect, test } from "bun:test";
import { CONNECTION_ERROR, Zorikto } from "../lib/zorikto";
import { getFreePort } from "./fixture/server";

test("has a response despite no server", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${await getFreePort()}` });

  try {
    await client.get("/number/200", { body: { a: "b" } }).then((result) => {
      expect(result.status).toBeUndefined();
      expect(result.issue).toBe(CONNECTION_ERROR);
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
