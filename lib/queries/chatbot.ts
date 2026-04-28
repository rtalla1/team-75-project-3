import OpenAI from "openai"
import { getMenu } from "./menu"

const SYSTEM_PROMPT = `
You are Tara, the assistant for Taro Root, a bubble tea shop. The full menu is given below.

Help customers with menu questions, recommendations, prices, ingredient or allergen info you can infer from item descriptions, and how to use the ordering kiosk. For anything outside that scope, briefly say so and steer back to the menu or ordering.

You cannot see live inventory, today's specials, or order status. If asked, say you don't have access to that and suggest they ask a cashier.

How the kiosk works:
- Category tabs on the left: Classic Drink, Fruit Drink, Food.
- Tapping a drink opens a customization modal. Pick one sugar level (120%, 100%, 75%, 50%, 25%, 0%), optionally toggle Hot on Classic Drinks, and select any toppings. Confirm with "Add to Order".
- Tapping a food item adds it straight to the cart with no customization.
- The cart is the floating button at the bottom-right with a count badge; it slides open from the right. From there customers can Customize a drink, Remove an item, Clear all, or tap Place Order.
- The sidebar shows current weather and a "Try our..." shortcut that adds the recommended drink for the conditions.
- The kiosk does not ask for a name or payment; payment happens at the counter.

Reply in the same language the customer used. Keep responses to 1 or 2 short sentences. Plain prose only, no markdown, no lists, no headings.
`

// Represents a single chat message passed to/from the chatbot API.
// `id` is the OpenAI response ID used to thread multi-turn conversations.
export type ChatMessage = {
  message: string,
  id: string
}

// Internal result shape returned by continueConversation.
// `id` is the new OpenAI response ID to pass back for the next turn.
type Result = {
  id: string, 
  response: string,
  ok: boolean,
  error: string,
  errorCode: number
}

// Sentinel ID indicating the very first message in a conversation.
// When this ID is used, the system prompt and full menu are prepended to the message.
const FIRST_MESSAGE_CONVO_ID = 'init';

// Sends a message to the OpenAI chatbot and returns the assistant's reply.
// On the first message (id === 'init'), the system prompt and full menu are injected.
// Subsequent messages use the previous response ID to maintain conversation context.
export async function continueConversation(message: ChatMessage): Promise<Result> {
  if (!process.env.OPENAI_KEY) {
    return {
      id: "",
      response: "",
      ok: false,
      error: "Missing OPENAI_KEY",
      errorCode: 500
    };
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
  });

  try {
    // console.log("Incoming message:", message);

    let messageToSend = "";

    if (message.id === FIRST_MESSAGE_CONVO_ID) {
      messageToSend += SYSTEM_PROMPT + "\n\n";

      const menuFetch = await getMenu();

      menuFetch.forEach((item) => {
        messageToSend += `Item Name: ${item.itemname}`;
        messageToSend += `  Item Description: ${item.description}`;
        messageToSend += `  Item Category: ${item.category}`;
        messageToSend += `  Item Price: ${item.price}\n\n`;
      });
    }

    messageToSend += "\n\n" + message.message;

    // console.log("Message to send:\n", messageToSend);

    const result = await openai.responses.create({
      model: "gpt-5-nano",
      input: messageToSend,
      ...(message.id && message.id !== FIRST_MESSAGE_CONVO_ID
        ? { previous_response_id: message.id }
        : {})
    });

    const responseText =
      result.output_text ||
      //@ts-ignore
      result.output?.[0]?.content?.[0]?.text ||
      "";

    // console.log("Response ID:", result.id);
    // console.log("Response Text:", responseText);

    return {
      id: result.id,
      response: responseText,
      ok: true,
      error: "",
      errorCode: 200
    };

  } catch (err: any) {
    console.error("OpenAI Error:", err);

    return {
      id: "",
      response: "",
      ok: false,
      error: err?.message || "Unknown error",
      errorCode: err?.status || 500
    };
  }
}