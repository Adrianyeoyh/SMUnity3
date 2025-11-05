import { serveStatic } from "hono/bun";
import { Hono } from "hono";
import { env } from "./env";
import { auth } from "./lib/auth";
import { apiRouter } from "./api";
import { authMiddleware } from "./middlewares/auth";
// tell Vercel to run this file on the edge runtime
export const config = { runtime: "edge" };


const api = new Hono()
  .use(authMiddleware)
  .get("/runtime.js", (c) => {
    console.log("VITE_APP_URL:", env.VITE_APP_URL);
    return c.text(
      `
      window.__env = ${JSON.stringify(
        Object.fromEntries(
          Object.entries(env).filter(([k]) => k.startsWith("VITE_"))
        ),
        null,
        2
      )}
      `.trim(),
      200,
      { "Content-Type": "application/javascript" }
    );
  })
  .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/", apiRouter);

const app = new Hono()
  .route("/api", api)
  .get("/health", (c) => c.json({ status: "ok" }))
  // static files for local fallback or when running in Bun dev
  .use("/assets/*", serveStatic({ root: "./dist/static" }))
  .use("/*", serveStatic({ root: "./dist/static" }))
  .get("*", serveStatic({ path: "./dist/static/index.html" }));

app.onError((err, c) => {
  console.error("🔥 Server error:", err);
  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
      stack:
        process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
    500
  );
});

if (process.env.NODE_ENV === "development") {
  const server = Bun.serve({ port: 4001, fetch: app.fetch });
  console.log(`🔈 Dev server on http://localhost:${server.port}`);
}


// ✅ This is the only export Vercel needs
export default app.fetch;
