import amqp from "amqplib";
import { declareAndBind, SimpleQueueType } from "./declareAndBind.js";

export enum AckType {
    Ack,
    NackRequeue,
    NackDiscard,
}

export async function subscribeJSON<T>(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType, // an enum to represent "durable" or "transient"
    handler: (data: T) => Promise<AckType> | AckType,
): Promise<void> {
    const [channel, queue] = await declareAndBind(
        conn,
        exchange,
        queueName,
        key,
        queueType,
    );
    const callback = async (msg: amqp.ConsumeMessage | null) => {
        if (msg === null) {
            return;
        }
        let data: T;
        try {
            data = JSON.parse(msg.content.toString("utf-8"));
        } catch (err) {
            console.error("Could not unmarshal message:", err);
            return;
        }

        try {
            const ackType = await handler(data);
            if (ackType === AckType.Ack) {
                channel.ack(msg);
                console.log("Ack");
            } else if (ackType === AckType.NackRequeue) {
                channel.nack(msg, false, true);
                console.log("NackRequeue");
            } else if (ackType === AckType.NackDiscard) {
                channel.nack(msg, false, false);
                console.log("NackDiscard");
            } else {
                console.log("Unexpected ack type");
            }
        } catch (err) {
            console.error("Error handling message:", err);
            channel.nack(msg, false, false);
            return;
        }
    };
    await channel.consume(queueName, callback);
}
