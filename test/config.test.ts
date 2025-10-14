import { expect, test } from "bun:test";
import { Zorikto } from "../lib/zorikto";

const validConfig = {
  baseUrl: "http://localhost:42069",
  headers: { "X-I-LOVE-BUN": "Hello, Bun!" },
};

test("returns an object when we configure correctly", async (_done) => {
  const client = new Zorikto(validConfig);

  expect(client).toBeObject();
  expect(client.ky).toBeObject();

  const url = client.getBaseUrl();
  expect(url).toBe(new URL(validConfig.baseUrl).toString());

  const baseUrl = client.getBaseUrl("url");
  expect(baseUrl).toBeInstanceOf(URL);

  const exampleUrl = new URL("https://example.com");
  client.setBaseUrl(exampleUrl);
  expect(client.getBaseUrl().toString()).toBe(exampleUrl.toString());
});
