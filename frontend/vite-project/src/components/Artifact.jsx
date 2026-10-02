import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Code2, Copy, Download, Eye, FileCode2, Files, GripVertical, RefreshCw, X } from "lucide-react";

const CODE_BLOCK = /```([^\n`]*)\n([\s\S]*?)```/g;
const PREVIEW_LANGUAGES = new Set(["html", "htm", "css", "js", "javascript", "jsx", "tsx"]);

function getLatestCode(messageList) {
  for (let messageIndex = messageList.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messageList[messageIndex];
    if (message?.role !== "assistant" || typeof message.content !== "string") continue;

    const files = [...message.content.matchAll(CODE_BLOCK)].map((match, index) => {
      const fenceInfo = match[1].trim();
      const language = fenceInfo.split(/[\s:]/)[0].toLowerCase() || "text";
      const suppliedName = fenceInfo.match(/(?:^|[:\s])([\w./-]+\.[a-z0-9]+)$/i)?.[1];
      return {
        id: `${messageIndex}-${index}`,
        language,
        code: match[2].replace(/\n$/, ""),
        name: suppliedName || `${language === "text" ? "code" : language}-${index + 1}.${extensionFor(language)}`,
      };
    });

    if (files.length) return { messageIndex, files };
  }

  return null;
}

function extensionFor(language) {
  return ({ javascript: "js", html: "html", htm: "html", css: "css", jsx: "jsx", tsx: "tsx", typescript: "ts", python: "py", json: "json" })[language] || language;
}

function escapeScript(source) {
  return source.replace(/<\/script/gi, "<\\/script");
}

function makePreview(files, activeFileId) {
  const htmlFile = files.find((file) => ["html", "htm"].includes(file.language));
  const css = files.filter((file) => file.language === "css").map((file) => file.code).join("\n");
  const javascript = files.filter((file) => ["js", "javascript"].includes(file.language)).map((file) => file.code).join("\n");

  const reactFile = files.find((file) => ["jsx", "tsx"].includes(file.language));
  const selectedFile = files.find((file) => file.id === activeFileId);
  if (!htmlFile && !css && !javascript && !reactFile) return null;

  if (reactFile && (!selectedFile || ["jsx", "tsx"].includes(selectedFile.language))) {
    const source = reactFile.code
      .replace(/^\s*import\s+React\s*,?\s*\{([^}]+)\}\s*from\s*["']react["'];?\s*$/gm, "const {$1} = React;")
      .replace(/^\s*import\s+\{([^}]+)\}\s*from\s*["']react["'];?\s*$/gm, "const {$1} = React;")
      .replace(/^\s*import\s+React\s+from\s*["']react["'];?\s*$/gm, "")
      .replace(/^\s*import\s+[^;\n]+;?\s*$/gm, "")
      .replace(/\bexport\s+default\s+(?=(?:function|class)\b)/g, "")
      .replace(/^\s*export\s+default\s+[A-Za-z_$][\w$]*\s*;?\s*$/gm, "")
      .replace(/^\s*export\s+(?=(?:function|class|const|let|var)\b)/gm, "");
    const componentName = source.match(/(?:function|class)\s+([A-Z][\w$]*)|(?:const|let|var)\s+([A-Z][\w$]*)\s*=/)?.slice(1).find(Boolean) || "App";
    const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: blob: https:; img-src data: blob: https:; style-src \'unsafe-inline\' https:; script-src \'unsafe-inline\' https://unpkg.com https://cdnjs.cloudflare.com; font-src data: https:; connect-src https:; frame-src \'none\'; form-action \'none\'; base-uri \'none\'">';
    const cssTag = css ? `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>` : "";
    const escapedSource = JSON.stringify(source).replace(/</g, "\\u003c");
    const babelPresets = reactFile.language === "tsx" ? "['react','typescript']" : "['react']";
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${policy}${cssTag}<style>html,body,#root{min-height:100%;margin:0}body{font-family:Inter,ui-sans-serif,system-ui,sans-serif}</style></head><body><div id="root" style="padding:20px;color:#475569;font:14px system-ui">Loading React preview… If the runtime is blocked, select the HTML file above for its standalone preview.</div><script src="https://unpkg.com/react@18/umd/react.development.js"><\/script><script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.5/babel.min.js"><\/script><script>window.addEventListener('load',function(){try{if(!window.React||!window.ReactDOM||!window.Babel)throw new Error('The React preview runtime could not load. Select the HTML file above for its standalone preview.');var code=${escapedSource};var result=Babel.transform(code,{presets:${babelPresets}}).code;new Function('React','ReactDOM',result+';ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(${componentName}));')(React,ReactDOM)}catch(error){document.getElementById('root').innerHTML='<pre style="margin:24px;padding:16px;color:#9f1239;background:#fff1f2;white-space:pre-wrap;border-radius:12px">React preview could not start. Select the HTML file above for its standalone preview.\\n\\n'+String(error).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})+'</pre>'}});<\/script></body></html>`;
  }

  let document = htmlFile?.code || "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body></body></html>";
  const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; font-src data:; connect-src \'none\'; frame-src \'none\'; form-action \'none\'; base-uri \'none\'">';
  const styleTag = css ? `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>` : "";
  const scriptTag = javascript ? `<script>${escapeScript(javascript)}<\/script>` : "";

  if (/<head\b[^>]*>/i.test(document)) {
    document = document.replace(/<head\b[^>]*>/i, (head) => `${head}${policy}${styleTag}`);
  } else if (/<html\b[^>]*>/i.test(document)) {
    document = document.replace(/<html\b[^>]*>/i, (html) => `${html}<head>${policy}${styleTag}</head>`);
  } else {
    document = `<!doctype html><html><head><meta charset="utf-8">${policy}${styleTag}</head><body>${document}</body></html>`;
  }
  if (scriptTag) {
    document = /<\/body\s*>/i.test(document)
      ? document.replace(/<\/body\s*>/i, `${scriptTag}</body>`)
      : `${document}${scriptTag}`;
  }
  return document;
}

function Artifact({ open, onClose }) {
  const { message = [] } = useSelector((state) => state.message);
  const artifact = useMemo(() => getLatestCode(message), [message]);
  const [activeFileId, setActiveFileId] = useState("");
  const [view, setView] = useState("preview");
  const [copied, setCopied] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => Math.min(760, Math.max(420, window.innerWidth * 0.52)));
  const resizeState = useMemo(() => ({ pointerId: null, startX: 0, startWidth: 0 }), []);

  useEffect(() => {
    setActiveFileId(artifact?.files[0]?.id || "");
    setView("preview");
  }, [artifact?.messageIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    const resize = (event) => {
      if (resizeState.pointerId === null) return;
      setPanelWidth(Math.min(window.innerWidth * 0.9, Math.max(360, resizeState.startWidth + resizeState.startX - event.clientX)));
    };
    const stopResize = () => { resizeState.pointerId = null; };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
    return () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [resizeState]);

  const activeFile = artifact?.files.find((file) => file.id === activeFileId) || artifact?.files[0];
  const preview = useMemo(() => artifact ? makePreview(artifact.files, activeFileId) : null, [artifact, activeFileId]);
  const canPreview = artifact?.files.some((file) => PREVIEW_LANGUAGES.has(file.language));

  const copyCode = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const downloadCode = () => {
    if (!activeFile) return;
    const url = URL.createObjectURL(new Blob([activeFile.code], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = activeFile.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <>
    <button type="button" aria-label="Close artifact panel" onClick={onClose} className="fixed inset-0 z-40 cursor-default bg-black/45 backdrop-blur-[1px]" />
    <aside role="dialog" aria-modal="true" aria-label="Artifacts" style={{ width: window.innerWidth < 640 ? "100vw" : `${panelWidth}px`, maxWidth: "100vw" }} className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] flex-col overflow-hidden border-l border-white/[0.08] bg-[#101116] shadow-2xl shadow-black/50 sm:max-w-[94vw]">
      <div
        role="separator"
        aria-label="Resize artifact panel"
        aria-orientation="vertical"
        title="Drag to resize"
        onPointerDown={(event) => {
          resizeState.pointerId = event.pointerId;
          resizeState.startX = event.clientX;
          resizeState.startWidth = panelWidth;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setPanelWidth((width) => Math.min(window.innerWidth * 0.9, width + 32));
          if (event.key === "ArrowRight") setPanelWidth((width) => Math.max(360, width - 32));
        }}
        tabIndex={0}
        className="group absolute inset-y-0 left-0 z-10 hidden w-2 cursor-col-resize items-center justify-center outline-none hover:bg-violet-400/15 focus-visible:bg-violet-400/20 sm:flex"
      ><GripVertical size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" /></div>
      <header className="h-14 px-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-400/20 flex items-center justify-center">
            <Files size={14} className="text-violet-300" />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-slate-100">Artifacts</h2>
            <p className="text-[10px] text-slate-500">Code and live preview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFile && <span className="text-[10px] text-slate-500">{artifact.files.length} file{artifact.files.length === 1 ? "" : "s"}</span>}
          <button type="button" aria-label="Close artifacts" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-100"><X size={15} /></button>
        </div>
      </header>

      {!activeFile ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
            <FileCode2 size={20} className="text-slate-500" />
          </div>
          <p className="text-[13px] font-medium text-slate-300">Your code will appear here</p>
          <p className="text-[11px] leading-relaxed text-slate-500 mt-2">Ask Nexora to build something in Coding mode to see its files and preview.</p>
        </div>
      ) : (
        <>
          <div className="px-3 pt-3 flex gap-1 shrink-0">
            <button onClick={() => setView("preview")} disabled={!canPreview} className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-medium transition-colors ${view === "preview" ? "bg-[#1a1c24] text-slate-100" : "text-slate-500 hover:text-slate-300"} disabled:opacity-40 disabled:cursor-not-allowed`}>
              <Eye size={13} /> Preview
            </button>
            <button onClick={() => setView("code")} className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-medium transition-colors ${view === "code" ? "bg-[#1a1c24] text-slate-100" : "text-slate-500 hover:text-slate-300"}`}>
              <Code2 size={13} /> Code
            </button>
          </div>

          {artifact.files.length > 1 && (
            <div className="px-3 py-2 flex gap-1 overflow-x-auto border-y border-white/[0.06] [scrollbar-width:none]">
              {artifact.files.map((file) => (
                <button key={file.id} onClick={() => setActiveFileId(file.id)} className={`px-2.5 py-1.5 rounded-md text-[10px] whitespace-nowrap transition-colors ${activeFile.id === file.id ? "bg-indigo-500/15 text-indigo-200" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"}`}>
                  {file.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0 bg-[#1a1c24] overflow-hidden">
            {view === "preview" ? (
              preview ? (
                <iframe key={`${artifact.messageIndex}-${artifact.files.map((file) => file.id).join(",")}`} title="Generated code preview" srcDoc={preview} sandbox="allow-scripts" referrerPolicy="no-referrer" className="w-full h-full border-0 bg-white" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-7">
                  <RefreshCw size={18} className="text-slate-500 mb-3" />
                  <p className="text-[12px] text-slate-300">This file needs a project runtime to preview.</p>
                  <p className="text-[10px] text-slate-500 mt-1.5">HTML, CSS, and JavaScript files can be previewed here.</p>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="h-10 px-3 flex items-center justify-between border-b border-white/[0.06] shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono">{activeFile.name}</span>
                  <div className="flex gap-1">
                    <button onClick={copyCode} title="Copy code" className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-white/[0.06]"><Copy size={13} /></button>
                    <button onClick={downloadCode} title="Download file" className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-white/[0.06]"><Download size={13} /></button>
                  </div>
                </div>
                {copied && <span className="absolute right-5 mt-12 z-10 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-200">Copied</span>}
                <pre className="flex-1 overflow-auto p-4 text-[11px] leading-[1.65] text-slate-300 font-mono whitespace-pre [scrollbar-width:thin] [scrollbar-color:#343642_transparent]"><code>{activeFile.code}</code></pre>
              </div>
            )}
          </div>
          {view === "preview" && (
            <div className="h-8 px-3 flex items-center justify-between border-t border-white/[0.06] shrink-0">
              <span className="text-[9px] text-slate-600">Preview runs in an isolated browser frame</span>
              <button onClick={() => setView("code")} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"><Code2 size={11} /> View code</button>
            </div>
          )}
        </>
      )}
    </aside>
    </>
  );
}

export default Artifact;
