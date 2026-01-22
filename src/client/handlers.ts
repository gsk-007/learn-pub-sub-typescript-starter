import type {
    ArmyMove,
    RecognitionOfWar,
} from "../internal/gamelogic/gamedata.js";
import type {
    GameState,
    PlayingState,
} from "../internal/gamelogic/gamestate.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handleWar, WarOutcome } from "../internal/gamelogic/war.js";
import { AckType } from "../internal/pubsub/subscribeJSON.js";
import { publishJSON } from "../internal/pubsub/publishJSON.js";
import {
    ExchangePerilTopic,
    WarRecognitionsPrefix,
} from "../internal/routing/routing.js";
import { type ConfirmChannel } from "amqplib";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {
    return (ps: PlayingState) => {
        handlePause(gs, ps);
        process.stdout.write("> ");
        return AckType.Ack;
    };
}

export function handlerMove(
    gs: GameState,
    publishCh: ConfirmChannel,
): (move: ArmyMove) => Promise<AckType> {
    return async (move: ArmyMove) => {
        try {
            const moveOutcome = handleMove(gs, move);
            console.log(
                `Moved ${move.units.length} units to ${move.toLocation}`,
            );
            if (moveOutcome === MoveOutcome.Safe) {
                return AckType.Ack;
            } else if (moveOutcome === MoveOutcome.SamePlayer) {
                return AckType.Ack;
            } else if (moveOutcome === MoveOutcome.MakeWar) {
                const data: RecognitionOfWar = {
                    attacker: move.player,
                    defender: gs.getPlayerSnap(),
                };
                try {
                    await publishJSON(
                        publishCh,
                        ExchangePerilTopic,
                        `${WarRecognitionsPrefix}.${gs.getUsername()}`,
                        data,
                    );
                } catch (err) {
                    console.error("Error publishing war recognition:", err);
                    return AckType.NackRequeue;
                }
                return AckType.Ack;
            } else {
                return AckType.NackDiscard;
            }
        } finally {
            process.stdout.write("> ");
        }
    };
}

export function handlerWar(
    gs: GameState,
): (rg: RecognitionOfWar) => Promise<AckType> {
    return async (rg: RecognitionOfWar) => {
        const warOutcome = handleWar(gs, rg);
        try {
            switch (warOutcome.result) {
                case WarOutcome.NotInvolved:
                    return AckType.NackRequeue;
                case WarOutcome.NoUnits:
                    return AckType.NackDiscard;
                case WarOutcome.OpponentWon:
                    return AckType.Ack;
                case WarOutcome.YouWon:
                    return AckType.Ack;
                case WarOutcome.Draw:
                    return AckType.Ack;
                default:
                    return AckType.NackDiscard;
            }
        } finally {
            process.stdout.write("> ");
        }
    };
}
