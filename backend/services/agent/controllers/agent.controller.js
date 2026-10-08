import graph from "../graph/graph.js";
import router from "../graph/router.js";
import { addMessage } from "../config/memory.js";
import Message from "../../chat/models/message.Model.js";

const progressFor = (agentName) => {
  const labels = {
    imagegen: "Generating your photo…",
    coding: "Building your code preview…",
    pdf: "Reading your documents…",
    ppt: "Preparing your presentation…",
    search: "Searching for current information…",
    chat: "Writing your answer…",
  };
  return labels[agentName] || "Understanding your request…";
};

const runAgentRequest = async (req, res, emit = null) => {
  let stage = "validate request";
  let imageRequested = false;
  const reply = (status, body) => {
    if (emit) {
      emit(status >= 400 ? "error" : "complete", { status, ...body });
      return res.end();
    }
    return res.status(status).json(body);
  };
  const progress = (message) => emit?.("status", { message });

  try {
    const { prompt, conversationId, agent, documentIds } = req.body;
    if (!prompt?.trim()) return reply(400, { message: "A prompt is required." });
    if (!conversationId) return reply(400, { message: "A conversation is required." });
    const userId = req.headers["x-user-id"];
    if (!userId) return reply(401, { message: "Sign in before sending a message." });

    const selectedAgent = String(agent || "auto").toLowerCase();
    const routedAgent = await router({ prompt, agent: selectedAgent, documentIds: Array.isArray(documentIds) ? documentIds : [] });
    const agentName = String(routedAgent.agent).toLowerCase();
    imageRequested = agentName === "imagegen"
      || (agentName === "auto" && /\b(create|generate|draw|make|edit)\b.{0,45}\b(image|picture|illustration|artwork|photo)\b|\b(image|picture|illustration)\b.{0,35}\b(of|for)\b/i.test(prompt));
    stage = "save user message";
    progress("Saving your message…");
    await addMessage(conversationId, "user", prompt);

    stage = "contact chat service";
    await Message.create({
      conversationId,
      role: "user",
      content: prompt,
    });

    stage = "run assistant agent";
    progress(progressFor(agentName));
    const result = await graph.invoke({
      prompt,
      conversationId,
      agent: routedAgent.agent,
      userId,
      documentIds: Array.isArray(documentIds) ? documentIds : [],
    });
    const response = result.aiResponse;

    stage = "save assistant response";
    progress("Saving your answer…");
    await addMessage(conversationId, "assistant", response);
    await Message.create({
      conversationId,
      role: "assistant",
      content: response,
      images: result.images || [],
    });
    return reply(200, { answer: response, images: result.images || [] });
  } catch (error) {
    console.error(`Agent request failed while trying to ${stage}:`, error);
    if (stage === "save user message") {
      return reply(503, { message: "Conversation storage is unavailable. Check that Redis is running and REDIS_URL is set for the agent service." });
    }
    if (stage.includes("chat service")) {
      return reply(503, { message: "Nexora could not reach the chat service to save this conversation. Check CHAT_SERVICE and make sure the chat service is running." });
    }
    if (stage.includes("assistant response")) {
      return reply(503, { message: "The assistant replied, but Nexora could not save the response. Check Redis and the chat service, then retry." });
    }
    if (imageRequested && stage === "run assistant agent") {
      return reply(502, { message: "The local photo generator stopped before it could return a result. Check the agent logs for a ComfyUI startup or model error." });
    }
    if (error.message?.startsWith("AI provider is not configured")) {
      return reply(503, { message: error.message });
    }
    if (error.message?.startsWith("Web search failed:")) {
      return reply(502, { message: "Web search is unavailable right now. Check the Tavily configuration and try again." });
    }
    return reply(500, { message: "The assistant could not complete this request. Please try again." });
  }
};

export const agent = (req, res) => runAgentRequest(req, res);

export const streamAgent = (req, res) => {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  const emit = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  // Image generation runs on the user's laptop and can take several minutes.
  // Keep the SSE connection active while ComfyUI renders so hosting proxies
  // don't treat the quiet period as a dead request.
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) emit("status", { message: "Nexora is still working…" });
  }, 15000);
  const clearHeartbeat = () => clearInterval(heartbeat);
  res.on("close", clearHeartbeat);
  return runAgentRequest(req, res, emit).finally(clearHeartbeat);
};
