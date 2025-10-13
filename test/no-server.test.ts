import { expect, test } from "bun:test";
import { CONNECTION_ERROR, Zorikto } from "../src/zorikto";
import { getFreePort } from "./fixture/server";

test("has a response despite no server", async (done) => {
  const client = new Zorikto({ baseUrl: `http://localhost:${await getFreePort()}` });

  try {
    await client.get("/number/200", { a: "b" }).then((response) => {
      expect(response.status).toBeUndefined();
      expect(response.issue).toBe(CONNECTION_ERROR);
    });
  } catch (error) {
    done(error);
  } finally {
    done();
  }
});
