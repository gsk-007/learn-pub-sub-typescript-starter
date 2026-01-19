import type { ConfirmChannel } from "amqplib";

export async function publishJSON<T>(
    ch: ConfirmChannel,
    exchange: string,
    routingKey: string,
    value: T,
): Promise<void> {
    const content = Buffer.from(JSON.stringify(value), "utf-8");
    ch.publish(exchange, routingKey, content, {
        contentType: "application/json",
    });
}
