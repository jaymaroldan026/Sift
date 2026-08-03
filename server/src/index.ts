import { createApp } from "./app";
import { createDatabase } from "./database/db";

const port = Number.parseInt(process.env.SIFT_SERVER_PORT ?? "5174", 10);
const host = process.env.SIFT_SERVER_HOST ?? "127.0.0.1";
const databasePath = process.env.SIFT_DATABASE_PATH ?? "server/database/sift.sqlite";

const database = createDatabase(databasePath);
const app = createApp(database);

const server = app.listen(port, host, () => {
  console.log(`Sift API listening at http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      database.close();
      process.exit(0);
    });
  });
}
