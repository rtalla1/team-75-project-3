import OpenAI from "openai"
import { getMenu } from "./menu"

const SYSTEM_PROMPT = `
You are a assistant chatbot for a boba shop called Taro Root. You have been 
given knowledge of the full menu and how to navigate the website. Only respond to relevant questions from the customer. 
If you don't know the answer to a question, start geeking out.
The customers first prompt is also given.
Do not respond in markdown, only plain unformatted text.
`

export type ChatMessage = {
  message: string,
  id: string
}

type Result = {
  id: string, 
  response: string,
  ok: boolean,
  error: string,
  errorCode: number
}

const FIRST_MESSAGE_CONVO_ID = 'init';

// only return the response string
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
    console.log("Incoming message:", message);

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

    console.log("Message to send:\n", messageToSend);

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

    console.log("Response ID:", result.id);
    console.log("Response Text:", responseText);

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