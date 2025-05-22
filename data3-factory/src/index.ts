import express from "express";
import axios from "axios";
import { createHealthRouter } from "./healthrouter";
import { createApiWrapperRouter } from "./apiwapperrouter";

class Server {
    private app: express.Application;
    private server: any;

    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    private setupRoutes() {
        /** Health Check */
        const healthRouter = createHealthRouter();
        this.app.use(healthRouter);

        /** apiwrapper */
        const apiwrapperrouter = createApiWrapperRouter();
        this.app.use(apiwrapperrouter);

        this.app.post("/echo", (req, res) => {
            const { message } = req.body;
            res.json({ received: message });
        });
    }

    public start(port: number) {
        this.server = this.app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });

        const gracefulShutdown = () => {
            console.log("Received shutdown signal, closing server...");
            this.server.close(() => {
                console.log("Server closed successfully");
                process.exit(0);
            });

            setTimeout(() => {
                console.error(
                    "Could not close connections in time, forcefully shutting down"
                );
                process.exit(1);
            }, 5000);
        };

        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT", gracefulShutdown);
    }

    public async stop() {
        if (this.server) {
            this.server.close(() => {
                console.log("Server stopped");
            });
        }
    }
}

const server = new Server();
server.start(3344);
