/** @jest-environment @edge-runtime/jest-environment */

import route from "./dist/function/index";
import { createServer } from "http";
import fn_89aea9fe8430128985f75f8c1c5f3b587f5589bc from "./dist/function/89aea9fe8430128985f75f8c1c5f3b587f5589bc";
import fn_fb19b40967c0cc8330c9990b08ebc0f2d90f5e48 from "./dist/function/fb19b40967c0cc8330c9990b08ebc0f2d90f5e48";

test("hello", async () => {
  const server = createServer(async (req, res) => {
    const fullUrl = `http://localhost:1234${req.url}`;
    const headers = new Headers(req.headers);
    const request = new Request(fullUrl, {
      method: req.method,
      headers,
      body:
        req.method === "GET"
          ? null
          : new ReadableStream({
              async start(controller) {
                for await (const chunk of req) {
                  controller.enqueue(chunk);
                }
                controller.close();
              },
            }),
    });

    /** @type {Response} */
    let response;

    if (req.url?.includes("fb19b40967c0cc8330c9990b08ebc0f2d90f5e48")) {
      response = await fn_fb19b40967c0cc8330c9990b08ebc0f2d90f5e48(request);
    } else if (req.url?.includes("89aea9fe8430128985f75f8c1c5f3b587f5589bc")) {
      response = await fn_89aea9fe8430128985f75f8c1c5f3b587f5589bc(request);
    } else if (req.url === "/") {
      response = await route(request);
    }

    if (!response) {
      res.statusCode = 404;
      res.end();
      return;
    }

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.write(await response.text());
    res.end();
  });
  server.listen(1234);

  try {
    const x = await fetch(`http://localhost:1234`, {
      method: "POST",
      body: JSON.stringify({
        query: `
          query {
            users { name id posts { id title } }
            posts { title author { id name } }
          }
        `,
      }),
    });
    console.log(await x.text());
  } finally {
    server.close();
  }

  // const req = new Request("https://example.com", {
  //   method: "POST",
  //   body: JSON.stringify({
  //     query: `
  //     query {
  //       posts {
  //         __typename
  //         id
  //         author {
  //           id
  //           name
  //         }
  //       }
  //       users {
  //         __typename
  //         id
  //         name
  //         posts {
  //           id
  //         }
  //       }
  //     }
  //     `,
  //   }),
  // });
  // const response = await route(req);
  // const text = await response.text();
  // const json = JSON.parse(text);
  // console.log(JSON.stringify(json, null, 2));
});
