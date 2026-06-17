import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAccount } from "@/lib/account";
import { getOpenAI, CHAT_DEPLOYMENT } from "@/lib/ai/azure-openai";
import { retrieve } from "@/lib/ai/search";
import { buildSystemPrompt, buildGroundedUserMessage, extractSources } from "@/lib/ai/rag";
import { ASSISTANT_TOOLS, dispatchTool } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_HISTORY = 12;
const MAX_TOOL_ROUNDS = 3;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

// POST /api/assistant — streamed, RAG-grounded, app-aware assistant turn.
// Body: { messages: { role, content }[] }. Streams SSE events:
//   {type:"token",value} · {type:"sources",sources} · {type:"done"} · {type:"error",error}
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = validateMessages(body.messages);
  if (!messages) return NextResponse.json({ error: "messages invalides" }, { status: 400 });

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return NextResponse.json({ error: "Aucune question." }, { status: 400 });

  const supabase = createServerSupabase();
  const account = await resolveAccount(supabase, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: account.status });
  const me = account.user;

  // Retrieve grounding context for the latest question.
  const chunks = await retrieve(lastUser.content, 5);
  const sources = extractSources(chunks);

  // Build the OpenAI message list: system + prior turns + grounded final question.
  const history: ChatCompletionMessageParam[] = messages
    .slice(0, -1)
    .map((m) => ({ role: m.role, content: m.content }));

  let convo: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(me.prenom) },
    ...history,
    { role: "user", content: buildGroundedUserMessage(lastUser.content, chunks) },
  ];

  const client = getOpenAI();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const completion = await client.chat.completions.create({
            model: CHAT_DEPLOYMENT,
            messages: convo,
            tools: ASSISTANT_TOOLS,
            tool_choice: "auto",
            temperature: 0.3,
            stream: true,
          });

          let content = "";
          let finish: string | null = null;
          const toolCalls: Record<number, { id: string; name: string; args: string }> = {};

          for await (const part of completion) {
            const choice = part.choices[0];
            if (!choice) continue;
            const delta = choice.delta;

            if (delta?.content) {
              content += delta.content;
              send({ type: "token", value: delta.content });
            }
            for (const tc of delta?.tool_calls ?? []) {
              const cur = (toolCalls[tc.index] ??= { id: "", name: "", args: "" });
              if (tc.id) cur.id = tc.id;
              if (tc.function?.name) cur.name += tc.function.name;
              if (tc.function?.arguments) cur.args += tc.function.arguments;
            }
            if (choice.finish_reason) finish = choice.finish_reason;
          }

          const calls = Object.values(toolCalls);
          if (finish === "tool_calls" && calls.length > 0) {
            // Record the assistant's tool request, then run each tool and feed
            // the results back so the model can answer with real user data.
            convo = [
              ...convo,
              {
                role: "assistant",
                content: content || null,
                tool_calls: calls.map((c) => ({
                  id: c.id,
                  type: "function",
                  function: { name: c.name, arguments: c.args || "{}" },
                })),
              },
            ];
            for (const c of calls) {
              const result = await dispatchTool(c.name, c.args, { supabase, account: me });
              const toolMsg: ChatCompletionToolMessageParam = {
                role: "tool",
                tool_call_id: c.id,
                content: result,
              };
              convo.push(toolMsg);
            }
            continue; // next round: model now sees the tool output
          }

          break; // model produced a final answer
        }

        send({ type: "sources", sources });
        send({ type: "done" });
      } catch (e) {
        console.error("[api/assistant] stream error:", e);
        send({ type: "error", error: "Désolé, une erreur est survenue. Réessayez." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function validateMessages(input: unknown): ClientMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: ClientMessage[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed) continue;
    out.push({ role, content: trimmed.slice(0, 4000) });
  }
  if (out.length === 0) return null;
  return out.slice(-MAX_HISTORY);
}
