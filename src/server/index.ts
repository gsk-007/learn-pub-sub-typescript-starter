import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publishJSON.js";
import {
    ExchangePerilDirect,
    ExchangePerilTopic,
    PauseKey,
    GameLogSlug,
} from "../internal/routing/routing.js";
import { getInput, printServerHelp } from "../internal/gamelogic/gamelogic.js";
import {
    declareAndBind,
    SimpleQueueType,
} from "../internal/pubsub/declareAndBind.js";

async function main() {
    console.log("Starting Peril server...");
    const connectionString = "amqp://guest:guest@localhost:5672/";
    const connection = await amqp.connect(connectionString);
    console.log("Connected to RabbitMQ successfully.");

    const shutdown = async () => {
        console.log("Shutting down...");
        await connection.close();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    const channel = await connection.createConfirmChannel();

    await declareAndBind(
        connection,
        ExchangePerilTopic,
        GameLogSlug,
        `${GameLogSlug}.*`,
        SimpleQueueType.Durable,
    );

    printServerHelp();

    while (true) {
        const words = await getInput();
        if (words.length === 0) {
            continue;
        }

        const command = words[0];
        if (command === "pause") {
            console.log("Publishing paused game state");
            try {
                await publishJSON(channel, ExchangePerilDirect, PauseKey, {
                    isPaused: true,
                });
            } catch (err) {
                console.error("Error publishing pause message:", err);
            }
        } else if (command === "resume") {
            console.log("Publishing resumed game state");
            try {
                await publishJSON(channel, ExchangePerilDirect, PauseKey, {
                    isPaused: false,
                });
            } catch (err) {
                console.error("Error publishing resume message:", err);
            }
        } else if (command === "quit") {
            console.log("Goodbye!");
            process.exit(0);
        } else {
            console.log("Unknown command");
        }
    }
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
