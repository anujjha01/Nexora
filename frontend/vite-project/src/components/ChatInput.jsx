import {
  Code2,
  AlertCircle,
  FileText,
  FolderOpen,
  Globe,
  ImageIcon,
  MessageSquare,
  Mic,
  Paperclip,
  Presentation,
  Send,
  Square,
  Zap,
  X,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import sendMessage from "../features/sendMessage";
import { useSelector, useDispatch } from "react-redux";
import getMessages from "../features/getMessages";
import { setMessage, addMessage, setLoading, setLoadingStatus } from "../redux/messageSlice";
import { createConversation } from "../features/createConversation";
import {
  setSelectedConversation,
  addConversation,
  updateConversationTitle,
} from "../redux/conversationSlice";
import updateConversation from "../features/updateConversation";
import uploadDocument from "../features/uploadDocument";
import { deleteDocument, getDocuments } from "../features/getDocuments";

function ChatInput({ suggestedPrompt, onSuggestionHandled }) {
  const [value, setValue] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("Auto");
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [micError, setMicError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const fileInputRef = useRef(null);
  const { selectedConversation } = useSelector((state) => state.conversation);
  const { isLoading } = useSelector((state) => state.message);
  const abortControllerRef = useRef(null);
  const recognitionRef = useRef(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!suggestedPrompt) return;
    setValue(suggestedPrompt);
    onSuggestionHandled?.();
    handleSendMessage(suggestedPrompt);
  }, [suggestedPrompt]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setUploadError("");
    if (attachments.length + files.length > 5) {
      setUploadError("Attach up to five documents to one message.");
      return;
    }

    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await uploadDocument(file);
        if (result.error) {
          setUploadError(`${file.name}: ${result.error}`);
          break;
        }
        setAttachments((current) => [...current, result.document]);
      }
    } catch (error) {
      setUploadError(`Upload failed: ${error.message || "Please try again."}`);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleLibrary = async () => {
    const nextOpen = !libraryOpen;
    setLibraryOpen(nextOpen);
    if (!nextOpen) return;
    setUploadError("");
    setIsLoadingDocuments(true);
    const result = await getDocuments();
    if (Array.isArray(result)) setDocuments(result);
    else setUploadError(result.error);
    setIsLoadingDocuments(false);
  };

  const toggleAttachment = (document) => {
    setUploadError("");
    setAttachments((current) => {
      if (current.some((item) => item._id === document._id)) {
        return current.filter((item) => item._id !== document._id);
      }
      if (current.length >= 5) {
        setUploadError("Attach up to five documents to one message.");
        return current;
      }
      return [...current, document];
    });
  };

  const handleDeleteDocument = async (document) => {
    const result = await deleteDocument(document._id);
    if (result.error) {
      setUploadError(result.error);
      return;
    }
    setDocuments((current) => current.filter((item) => item._id !== document._id));
    setAttachments((current) => current.filter((item) => item._id !== document._id));
  };

  const handleSendMessage = async (messageText = value) => {
    if (isUploading) return;
    if (!messageText.trim()) return;
    const promptValue = messageText.trim();
    setValue(""); // clear the input field immediately

    dispatch(addMessage({ role: "user", content: promptValue }));

    let currentConversationId = selectedConversation?._id;
    let isNewConversation = false;

    if (!currentConversationId) {
      const newConvData = await createConversation();
      if (newConvData && newConvData.conversation) {
        currentConversationId = newConvData.conversation._id;
        dispatch(addConversation(newConvData.conversation));
        dispatch(setSelectedConversation(newConvData.conversation));
        isNewConversation = true;
      }
    }

    if (!currentConversationId) {
      dispatch(addMessage({ role: "assistant", content: "I couldn't start a conversation. Please try again." }));
      return;
    }

    // Auto-generate title from the first message of a new conversation
    if (isNewConversation && currentConversationId) {
      const generatedTitle =
        promptValue.length > 40
          ? promptValue.slice(0, 40).trimEnd() + "…"
          : promptValue;

      // Optimistically update the UI immediately
      dispatch(
        updateConversationTitle({
          id: currentConversationId,
          title: generatedTitle,
        }),
      );

      // Persist to backend (fire-and-forget, non-blocking)
      updateConversation(currentConversationId, generatedTitle);
    }

    const payload = {
      prompt: promptValue,
      conversationId: currentConversationId,
      agent: selectedAgent === "Image" ? "imageGen" : selectedAgent.toLowerCase(),
      documentIds: attachments.map((document) => document._id),
    };

    // If AI is currently generating, stop it before sending the new message
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Send message to the backend
    const controller = new AbortController();
    abortControllerRef.current = controller;

    dispatch(setLoading(true));
    dispatch(setLoadingStatus("Sending your message…"));
    const data = await sendMessage(payload, controller.signal, (status) => dispatch(setLoadingStatus(status)));
    // A newer send or Stop action may have replaced this request while it waited.
    if (abortControllerRef.current !== controller) return;
    dispatch(setLoading(false));
    abortControllerRef.current = null;
    if (data?.error) {
      dispatch(addMessage({ role: "assistant", content: data.error }));
      return;
    }

    // Refetch the updated messages list and update Redux store
    if (data && currentConversationId) {
      const fetchedMessages = await getMessages(currentConversationId);
      if (
        fetchedMessages.length > 0 &&
        fetchedMessages[fetchedMessages.length - 1].role !== "user"
      ) {
        fetchedMessages[fetchedMessages.length - 1].isStreaming = true;
      }
      dispatch(setMessage(fetchedMessages));
      setAttachments([]);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("Voice input isn't supported in this browser. You can type your prompt instead.");
      return;
    }

    setMicError("");
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .slice(event.resultIndex || 0)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) setValue((current) => `${current.trim()}${current.trim() ? " " : ""}${transcript}`);
    };
    recognition.onerror = (event) => {
      const messages = {
        "not-allowed": "Microphone access was denied. Allow microphone access in your browser settings and try again.",
        "service-not-allowed": "Microphone access is blocked. Check your browser permissions and try again.",
        "no-speech": "No speech was detected. Try speaking again.",
        "audio-capture": "No microphone was found. Check your microphone and try again.",
      };
      setMicError(messages[event.error] || "Voice input failed. Please try again or type your prompt.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setMicError("Voice input couldn't start. Please try again.");
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch(setLoading(false));
  };

  const agents = [
    {
      id: "auto",
      icon: Zap,
      label: "Auto",
    },
    {
      id: "chat",
      icon: MessageSquare,
      label: "Chat",
    },
    {
      id: "coding",
      icon: Code2,
      label: "Coding",
    },
    {
      id: "pdf",
      icon: FileText,
      label: "PDF",
    },
    {
      id: "ppt",
      icon: Presentation,
      label: "PPT",
    },
    {
      id: "imagegen",
      icon: ImageIcon,
      label: "Image",
    },
    {
      id: "search",
      icon: Globe,
      label: "Search",
    },
  ];

  return (
    <div className="w-full shrink-0 overflow-hidden border-t border-white/[0.06] bg-[#0d0f14] px-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 pt-3 pb-2.5 sm:gap-3 sm:px-4 sm:pt-3.5 sm:pb-3">

        {libraryOpen && (
          <div className="rounded-xl border border-white/[0.08] bg-[#11141b] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200">Your documents</span>
              <button type="button" onClick={() => setLibraryOpen(false)} aria-label="Close document library" className="text-slate-500 hover:text-white"><X size={14} /></button>
            </div>
            {isLoadingDocuments ? (
              <p className="py-3 text-xs text-slate-500">Loading documents…</p>
            ) : documents.length === 0 ? (
              <p className="py-3 text-xs text-slate-500">No documents uploaded yet. Attach a PDF, TXT, or Markdown file to add one.</p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {documents.map((document) => {
                  const isAttached = attachments.some((item) => item._id === document._id);
                  return (
                    <div key={document._id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                      <FileText size={14} className="shrink-0 text-indigo-300" />
                      <button type="button" onClick={() => toggleAttachment(document)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-xs text-slate-200">{document.fileName}</span>
                        <span className="text-[10px] text-slate-500">{document.pageCount} {document.pageCount === 1 ? "page" : "pages"} · {isAttached ? "Attached" : "Add to message"}</span>
                      </button>
                      <button type="button" title={`Delete ${document.fileName}`} onClick={() => handleDeleteDocument(document)} className="shrink-0 p-1 text-slate-600 hover:text-rose-300"><Trash2 size={13} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((document) => (
              <div key={document._id} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300">
                <FileText size={13} className="shrink-0 text-indigo-300" />
                <span className="max-w-48 truncate">{document.fileName}</span>
                <button type="button" aria-label={`Remove ${document.fileName}`} onClick={() => setAttachments((current) => current.filter((item) => item._id !== document._id))} className="text-slate-500 hover:text-white">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {(isUploading || uploadError) && (
          <div role="status" className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${uploadError ? "border-rose-400/15 bg-rose-400/[0.06] text-rose-200" : "border-indigo-400/15 bg-indigo-400/[0.05] text-slate-300"}`}>
            {uploadError && <AlertCircle size={14} className="shrink-0 text-rose-300" />}
            <span>{uploadError || "Uploading and indexing document…"}</span>
          </div>
        )}
        {(isListening || micError) && (
          <div role="status" aria-live="polite" className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${micError ? "border-rose-400/15 bg-rose-400/[0.06] text-rose-200" : "border-indigo-400/15 bg-indigo-400/[0.05] text-slate-300"}`}>
            {micError || "Listening… speak your prompt."}
          </div>
        )}

        {/* Agent pills row */}
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {agents.map((agent) => {
            const isActive = selectedAgent === agent.label;
            const Icon = agent.icon;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent.label)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedAgent(agent.label); }}
                aria-pressed={isActive}
                className={`flex-shrink-0 inline-flex min-h-8 items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${isActive
                  ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-[0_1px_8px_rgba(99,102,241,.35)]"
                  : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07]"
                  }`}
              >
                <Icon
                  size={13}
                  className={isActive ? "text-white" : "text-slate-500"}
                />
                <span>{agent.label}</span>
              </div>
            );
          })}
        </div>

        {/* Textarea + action buttons row */}
        <div className="flex min-w-0 items-end gap-1.5 sm:gap-2">
          <textarea
            placeholder="Ask Anything..."
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            value={value}
            className="max-h-32 min-w-0 flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-slate-200 outline-none placeholder:text-slate-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50 sm:max-h-40"
            rows={2}
          />

          <div className="flex items-center gap-1 shrink-0">
            <button type="button" title="Open document library" onClick={toggleLibrary} className={`flex items-center justify-center w-8 h-8 rounded-lg border border-transparent transition-all duration-150 bg-transparent cursor-pointer ${libraryOpen ? "text-indigo-300 bg-white/[0.05]" : "text-slate-600 hover:text-slate-400 hover:bg-white/[0.05]"}`}>
              <FolderOpen size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown" multiple className="hidden" onChange={handleFileUpload} />
            <button type="button" title="Attach PDF, TXT, or Markdown" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer disabled:cursor-wait">
              <Paperclip size={16} />
            </button>

            <button type="button" aria-label={isListening ? "Stop voice input" : "Start voice input"} aria-pressed={isListening} title={isListening ? "Stop voice input" : "Use voice input"} onClick={handleMicClick} className={`flex items-center justify-center w-8 h-8 rounded-lg border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer ${isListening ? "text-indigo-300 bg-white/[0.05]" : "text-slate-600 hover:text-slate-400 hover:bg-white/[0.05]"}`}>
              <Mic size={16} />
            </button>

            {/* Show Send when there's text (auto-stops any current generation),
                show Stop-only when loading with empty textarea */}
            {isLoading && !value.trim() ? (
              <button
                onClick={handleStop}
                title="Stop generating"
                className="flex items-center justify-center w-8 h-8 rounded-lg border-none transition-all duration-150 bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 cursor-pointer"
              >
                <Square size={13} fill="currentColor" />
              </button>
            ) : (
              <button
                disabled={!value.trim() || isUploading}
                onClick={handleSendMessage}
                title={isLoading ? "Stop and send new message" : "Send message"}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border-none transition-all duration-150 ${value.trim()
                  ? "bg-linear-to-br from-indigo-500 to-violet-700 hover:opacity-90 text-white cursor-pointer"
                  : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                  }`}
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
