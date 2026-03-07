import { Server } from "http";
import config from "./config";
import { connectMongoDB } from "./shared/database";
import app from "./app";
import scheduleExpiryCheck from "./utils/scheduleExpiryCheck";
import scheduleVideoUrlRefresh from "./utils/refreshVideoSignedUrls";

let server: Server;

async function startServer() {
  // CONNECT DATABASE FIRST
  await connectMongoDB();

  server = app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });

  scheduleExpiryCheck();
  scheduleVideoUrlRefresh();
}

async function main() {
  await startServer();

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.info("Server closed!");
        restartServer();
      });
    } else {
      process.exit(1);
    }
  };

  const restartServer = () => {
    console.info("Restarting server...");
    main();
  };

  process.on("uncaughtException", (error) => {
    console.log("Uncaught Exception: ", error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.log("Unhandled Rejection: ", error);
    exitHandler();
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received. Shutting down gracefully...");
    exitHandler();
  });

  process.on("SIGINT", () => {
    console.log("SIGINT signal received. Shutting down gracefully...");
    exitHandler();
  });
}

main();