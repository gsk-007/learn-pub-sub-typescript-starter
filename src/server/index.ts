import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publishJSON.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";

async function main() {
    console.log("Starting Peril server...");
    const connectionString = "amqp://guest:guest@localhost:5672/";
    const connection = await amqp.connect(connectionString);
    console.log("Connected to RabbitMQ successfully.");

    const channel = await connection.createConfirmChannel();
    const data: PlayingState = { isPaused: true };
    publishJSON(channel, ExchangePerilDirect, PauseKey, data);

    const shutdown = async () => {
        console.log("Shutting down...");
        await connection.close();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
