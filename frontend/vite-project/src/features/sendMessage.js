async function sendMessage(payload, signal, onProgress = () => {}) {
  try {
    const endpoint = new URL("/api/agent/chat/stream", window.location.origin).toString();
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { error: body.message || `Request failed with status ${response.status}.` };
    }
    if (!response.body) return { error: "Your browser could not open the live response stream. Refresh and try again." };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let result = null;
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = pending.split("\n\n");
      pending = events.pop() || "";
      for (const block of events) {
        const eventName = block.match(/^event:\s*(\w+)/m)?.[1];
        const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        let data;
        try { data = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
        if (eventName === "status") onProgress(data.message || "Working…");
        if (eventName === "complete") result = data;
        if (eventName === "error") result = { error: data.message || "The request failed." };
      }
      if (done) break;
    }

    if (result?.error) return result;
    if (!result) return { error: "The live response ended before Nexora returned an answer. Please try again." };
    return { answer: result.answer, images: result.images || [] };
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") return null;
    console.error(error);
    return { error: error.message || "The request failed. Please try again." };
  }
}

export default sendMessage;
