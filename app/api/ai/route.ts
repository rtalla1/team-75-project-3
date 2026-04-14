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
    //dummy code
    // const res = {
    //   id: "f9d8ahsas7897a6fsh",
    //   response: "some response from the ai",
    //   ok: true,
    //   error: "none",
    //   errorCode: 200
    // } as {
    //   id: string, 
    //   response: string,
    //   ok: boolean,
    //   error: string,
    //   errorCode: number
    // }
    
    console.log(res);

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
