import { ChatMessage, continueConversation } from "@/lib/queries/chatbot";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log(body);

    const message: string = String(body.message ?? "").trim()
    const id: string = String(body.id ?? "").trim()
    
    if (
      !message
    ) {
      return Response.json({ error: "message and id are required" }, { status: 400 });
    }
    
    const res = await continueConversation({message, id});

    console.log("RESULT: ", res);

    if (!res.ok) {
      return Response.json({ error: res.error }, { status: res.errorCode });
    }

    const result: ChatMessage = {
      id: res.id,
      message: res.response
    }
    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json({ error: error }, { status: 400 });
  }
}
