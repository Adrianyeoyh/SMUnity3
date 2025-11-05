// import { serve } from "@hono/node-server";
import { serveStatic } from 'hono/bun'
import { Hono } from "hono";
import { env } from "./env";
import { auth } from "./lib/auth";

import { apiRouter } from './api'
import { authMiddleware } from "./middlewares/auth";

const api = new Hono().use(authMiddleware)
  .get("/runtime.js", (c) => {
    console.log(env.VITE_APP_URL)
    return c.text(
      `
      window.__env = ${JSON.stringify(Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith("VITE_"))), null, 2)}
      `.trim(),
      200,
      { "Content-Type": "application/javascript" },
    );
  })
  .on(["POST", "GET"], "/auth/*", (c) => {
    return auth.handler(c.req.raw);
  })
  .route("/", apiRouter)

const app = new Hono()
  .route("/api", api)
  .get("/health", (c) => {
    return c.json({
      status: "ok",
    });
  })
  .use("/assets/*", serveStatic({ root: "./dist/static" }))
  .use("/*", serveStatic({ root: "./dist/static" }))
  .get("*", serveStatic({ path: "./dist/static/index.html" }));

// export default {
//   port: process.env.NODE_ENV == "development" ? 4001 : 4000,
//   ...app
// }


app.onError((err, c) => {
  console.error("🔥 Server error:", err);
  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
    500
  );
});


// ✅ Vercel still gets a fetch handler
export default app.fetch;