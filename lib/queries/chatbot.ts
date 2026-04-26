import OpenAI from "openai"
import { getMenu } from "./menu"

const SYSTEM_PROMPT = `
You are a assistant chatbot for a boba shop called Taro Root. You have been 
given knowledge of the full menu and how to navigate the website. Only respond to relevent questions from the customer. 
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

//only return the response string
export async function continueConversation(message: ChatMessage): Promise<Result> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
  })
  
  let messageToSend = message.message;
  if (message.id == "") {
    messageToSend += "\n\n";
    const menuFetch = await getMenu();
    menuFetch.forEach((item) => {
      messageToSend += "Item Name: " + item.itemname;
      messageToSend += "Item Description: " + item.description;
      messageToSend += "Item Category: " + item.category;
      messageToSend += "Item Price: " + item.price + "\n\n";
    });
  }

  console.log("Message to send: " + messageToSend);

  const result = await openai.responses.create({
    model: 'gpt-5.4-nano',
    input: (message.id == "" ? SYSTEM_PROMPT : "") + message.message,
    previous_response_id: (message.id == "" ? null : message.id)
  })
  
  const curId = result.id;
  const resp = result.output_text
  
  return {
    id: curId,
    response: resp,
    ok: result.error == null ? true : false,
    error: result.error?.message ?? "",
    errorCode: result.error?.code ?? 200,
  } as Result;
}