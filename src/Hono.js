import { Hono } from "hono";
import { fetch } from "@nsnanocat/util";
import HonoWorkerAdapter from "./class/HonoWorkerAdapter.mjs";
import { Request } from "./process/Request.mjs";
import { Response } from "./process/Response.mjs";
/***************** Processing *****************/
export default new Hono().all("/:rest{.*}", async c => {
    let $request = await HonoWorkerAdapter.buildRequest(c);
    let $response;
    ({ $request, $response } = await Request($request));
    switch (typeof $response) {
        case "object":
            console.debug("finally", `echo $response: ${JSON.stringify($response, null, 2)}`);
            return HonoWorkerAdapter.writeResponse(c, $response);
        case "undefined":
            console.debug("finally", `$request: ${JSON.stringify($request, null, 2)}`);
            $response = await fetch($request);
            $response = await Response($request, $response);
            return HonoWorkerAdapter.writeResponse(c, $response);
        default:
            console.error(`不合法的 $response 类型: ${typeof $response}`);
            return c.body("", 500);
    }
}).onError((e, c) => {
    console.error(`${e}`);
    return c.text(`${e}`, 500);
});
