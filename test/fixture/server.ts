const base = new Date().getSeconds() * 1_000;
let count = base + 376;

export function getFreePort(): Promise<number> {
  return Promise.resolve(++count);
}

function sendResponse(res: ResponseInit & { body?: any } = {}, body?: any) {
  return new Response(body, { status: res.status ?? 200, headers: res.headers });
}

function send200(body?: any) {
  return sendResponse({ status: 200 }, body ?? JSON.stringify({ ok: true }));
}

export async function createServer(port: number, mockData?: any) {
  const server = Bun.serve({
    port,
    fetch(request) {
      const url = new URL(request.url);
      const path = url.pathname;
      const searchParams = url.searchParams;

      if (path === "/ok") return send200();

      if (path.startsWith("/echo")) {
        const echo = searchParams.get("query") ?? null;
        return sendResponse({}, JSON.stringify({ echo }));
      }

      if (path.startsWith("/number")) {
        const status = Number(path.slice(8, 11));
        return sendResponse({ status }, mockData ? JSON.stringify(mockData) : undefined);
      }

      if (path.startsWith("/false")) {
        return sendResponse({}, JSON.stringify(false));
      }

      if (path.startsWith("/sleep")) {
        const ms = Number(path.split("/").pop());
        return new Promise<Response>((resolve) => setTimeout(() => resolve(send200()), ms));
      }

      if (path === "/post") {
        return request.json().then((data) => sendResponse({}, JSON.stringify(data)));
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  return server;
}
