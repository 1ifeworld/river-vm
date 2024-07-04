import { Hono } from "hono";
import type { Message } from "./rvm/lib/types.js";
import { River } from "./rvm/index.js";
import { isMessage } from "./rvm/lib/types.js";
import { deserializeMessageForHttp } from "./rvm/lib/buffers.js";

const app = new Hono();

export const river = await River.flow();

app.post("/messageBatch", async (c) => {
  try {
    // Receive data
    const data = await c.req.json();

    const serializedMessages = data.messages;

    let successfulMessages: string[] = [];

    for (let i = 0; i < serializedMessages.length; ++i) {
      const message: Message = deserializeMessageForHttp(serializedMessages[i]);

      if (!isMessage(message)) {
        return c.json({ error: "Invalid message format" }, 400);
      }

      const verified = await river.verifyMessage(message);

      if (!verified) {
        return c.json({ error: "Message not verified" }, 401);
      }

      const processMessageResponse = await river.processMessage(message);

      // if any message returns null, end entire request (stop processing messages)
      if (!processMessageResponse) {
        return c.json({ result: null });
      }

      successfulMessages.push(processMessageResponse);
    }

    return c.json({ result: successfulMessages });
  } catch (error) {
    console.error("Error processing message:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully");
  await river.disconnect();
  process.exit(0);
});

export default app;

console.log("Server ready");
