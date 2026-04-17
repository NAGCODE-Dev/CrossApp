import { buildApp } from "./app";

const app = await buildApp();

try {
  await app.listen({
    host: "0.0.0.0",
    port: Number(process.env.PORT || 8787),
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
