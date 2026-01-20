import amqp from "amqplib";
import {
    clientWelcome,
    commandStatus,
    getInput,
    printClientHelp,
    printQuit,
} from "../internal/gamelogic/gamelogic.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import {
    declareAndBind,
    SimpleQueueType,
} from "../internal/pubsub/declareAndBind.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";

async function main() {
    console.log("Starting Peril client...");
    const connectionString = "amqp://guest:guest@localhost:5672/";
    const connection = await amqp.connect(connectionString);
    console.log("Peril game client connected to RabbitMQ!");

    ["SIGINT", "SIGTERM"].forEach((signal) =>
        process.on(signal, async () => {
            try {
                await connection.close();
                console.log("RabbitMQ connection closed.");
            } catch (err) {
                console.error("Error closing RabbitMQ connection:", err);
            } finally {
                process.exit(0);
            }
        }),
    );

    const username = await clientWelcome();

    await declareAndBind(
        connection,
        ExchangePerilDirect,
        `${PauseKey}.${username}`,
        PauseKey,
        SimpleQueueType.Transient,
    );

    const gameState = new GameState(username);

    while (true) {
        const words = await getInput();
        if (words.length === 0) {
            continue;
        }

        const command = words[0];

        if (command === "spawn") {
            try {
                commandSpawn(gameState, words);
            } catch (err) {
                console.error("Error spawing a unit:", err);
            }
        } else if (command === "move") {
            try {
                commandMove(gameState, words);
            } catch (err) {
                console.error("Error moving a unit:", err);
            }
        } else if (command === "status") {
            commandStatus(gameState);
        } else if (command === "help") {
            printClientHelp();
        } else if (command === "spam") {
            console.log("Spamming nto allowed yet!");
        } else if (command == "quit") {
            printQuit();
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
