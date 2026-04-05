import { Hono } from "hono";
import { fetch } from "@nsnanocat/util";
import { Request } from "./process/Request.mjs";
import { Response } from "./process/Response.mjs";
/***************** Processing *****************/
export default new Hono().all("/:rest{.*}", async c => {
    let $request, $response;
    const url = new URL(c.req.url);
    switch (true) {
        case url.hostname.startsWith("test."): {
            url.hostname = "app.bilibili.com";
            break;
        }
        default: {
            const [host, ...path] = c.req.param("rest").split("/");
            url.protocol = "https:";
            url.hostname = host;
            url.port = "443";
			url.pathname = path.join("/");
        }
    }
    $request = {
        method: c.req.method,
        url: url.toString(),
        headers: c.req.header(),
        body: ["GET", "HEAD"].includes(c.req.method) ? undefined : new Uint8Array(await c.req.arrayBuffer()),
    };
    if ($request.headers["content-type"] === "application/grpc-web") $request.headers["content-type"] = "application/grpc";
    // --- 获取参数 --- //
    url.search
        .slice(1)
        .split('&')
        .forEach(pair => {
            let target = $argument;
            const [key, value] = pair.split('=');
            key.split('.').forEach((k, i, arr) => {
            if (i === arr.length - 1) target[k] = value;
            else target = target[k] = target[k] || {};
            });
        });
    ({ $request, $response } = await Request($request));
    if (!$response) {
        while (true) {
            try {
                $response = await fetch($request);
                break;
            } catch (e) {
                // console.error(e);
            }
        }
        $response = await Response($request, $response);
    };
    delete $response.headers["content-length"];
    return c.body(
        $response.body,
        $response.status,
        // $response.headers
    );
}).onError((e, c) => {
    console.error(`${e}`);
    return c.text(`${e}`, 500);
});
