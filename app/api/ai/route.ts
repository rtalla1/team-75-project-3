import { ChatMessage, continueConversation } from "@/lib/queries/chatbot";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body) {
      return Response.json({ error: "Missing body" }, { status: 400 });
    }
    
    const message: string = (body.message ?? "").trim()
    const id: string = (body.id ?? "").trim()
    
    if (
      !message ||
      !id
    ) {
      return Response.json({ error: "message and id are required" }, { status: 400 });
    }
    
    const res = await continueConversation({message, id} as ChatMessage);
    
    if (!res.ok) {
      return Response.json({ error: res.error }, { status: res.errorCode });
    }
    
    const result: ChatMessage = {id, message}
    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json({ error: error }, { status: 400 });
  }
}
