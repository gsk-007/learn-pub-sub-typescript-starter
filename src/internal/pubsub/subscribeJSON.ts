import amqp from "amqplib";
import { declareAndBind, SimpleQueueType } from "./declareAndBind.js";

export async function subscribeJSON<T>(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType, // an enum to represent "durable" or "transient"
    handler: (data: T) => void,
): Promise<void> {
    const [channel, queue] = await declareAndBind(
        conn,
        exchange,
        queueName,
        key,
        queueType,
    );
    const callback = (msg: amqp.ConsumeMessage | null) => {
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
        handler(data);
        channel.ack(msg);
    };
    await channel.consume(queueName, callback);
}
