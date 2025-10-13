import { expect, test } from "bun:test";
import { Zorikto } from "../src/zorikto";

const validConfig = {
  baseUrl: "http://localhost:42069",
  headers: { "X-I-LOVE-BUN": "Hello, Bun!" },
};

test("returns an object when we configure correctly", async (_done) => {
  const client = new Zorikto(validConfig);

  expect(client).toBeObject();
  expect(client.ky).toBeObject();
});
