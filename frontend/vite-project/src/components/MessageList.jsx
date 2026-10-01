import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import MessageBubble from "./MessageBubble";

function MessageList() {
  const bottomRef = useRef(null);
  const { selectedConversation } = useSelector(
    (state) => state.conversation
  );

  const { message, isLoading, loadingStatus } = useSelector((state) => state.message);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [message, isLoading, loadingStatus]);

  const suggestions = [
    "Build an AI agent with microservices",
    "Explain Redis",
    "Build a ChatGPT clone",
    "Create a Spring Boot backend",
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-6 py-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {message.length === 0 || !selectedConversation ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[20px] font-semibold text-slate-200 tracking-tight">
              Nexora AI
            </h1>

            <p className="text-[15px] font-semibold text-slate-200 tracking-tight">
              How can I help you?
            </p>

            <p className="text-[13px] text-slate-600 max-w-[260px] leading-relaxed">
              Ask me anything - code, ideas, explanations, or just a quick
              question.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {suggestions.map((s) => (
              <button
                key={s}
                className="text-[12px] text-slate-400 bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-slate-200 transition-colors duration-150 cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {message.map((msg, i) => (
            <div key={i}>
              <MessageBubble role={msg?.role} content={msg?.content} images={Array.isArray(msg?.images) ? msg.images : []} />
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start max-w-[72%] mt-5">
              <div role="status" aria-live="polite" className="px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-slate-200 rounded-tl-sm flex items-center gap-3 min-h-[42px]">
                <div className="flex space-x-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                </div>
                <span className="text-[11px] text-slate-400">{loadingStatus || "Working…"}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

export default MessageList;
