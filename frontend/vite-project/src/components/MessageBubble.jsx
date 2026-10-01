import Markdown from "react-markdown";
import api from "../../utils/axios";

const markdownComponents = {
    p: ({ children }) => <p className="my-2.5 leading-7 text-[13.5px] text-inherit first:mt-0 last:mb-0">{children}</p>,
    h1: ({ children }) => <h1 className="mt-5 mb-2 text-xl font-semibold tracking-tight text-slate-50 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="mt-5 mb-2 text-lg font-semibold tracking-tight text-slate-50 first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-4 mb-1.5 text-base font-semibold text-slate-100 first:mt-0">{children}</h3>,
    ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-indigo-300">{children}</ul>,
    ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:text-indigo-300">{children}</ol>,
    li: ({ children }) => <li className="pl-1 leading-6 text-inherit">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-slate-50">{children}</strong>,
    blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-indigo-400/60 pl-3 text-slate-300">{children}</blockquote>,
    hr: () => <hr className="my-4 border-white/10" />,
    a: ({ href, children, ...props }) => {
        const target = href?.startsWith("/api/agent/") && api.defaults.baseURL
            ? new URL(href, api.defaults.baseURL).toString()
            : href;
        return <a href={target} target="_blank" rel="noreferrer" className="text-indigo-300 underline decoration-indigo-300/30 underline-offset-2 hover:text-indigo-200" {...props}>{children}</a>;
    },
    pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#090b10] p-3.5 text-[12px] leading-6 text-slate-200 [scrollbar-width:thin]">{children}</pre>,
    code: ({ children, className }) => className
        ? <code className={`${className} font-mono text-[12px]`}>{children}</code>
        : <code className="rounded-md bg-black/20 px-1.5 py-0.5 font-mono text-[0.9em] text-indigo-200">{children}</code>,
    table: ({ children }) => <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-white/[0.09]"><table className="w-full border-collapse text-left text-[12px]">{children}</table></div>,
    thead: ({ children }) => <thead className="bg-white/[0.06] text-slate-100">{children}</thead>,
    th: ({ children }) => <th className="whitespace-nowrap border-b border-white/[0.09] px-3.5 py-2.5 font-semibold">{children}</th>,
    td: ({ children }) => <td className="min-w-24 border-b border-white/[0.05] px-3.5 py-2.5 align-top text-slate-300 last:border-0">{children}</td>,
};

const splitCells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
const isTableLine = (line) => line.includes("|");
const isSeparatorLine = (line) => {
    const cells = splitCells(line);
    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
};

function renderContent(content) {
    const lines = String(content || "").split("\n");
    const segments = [];
    let plainLines = [];
    let inFence = false;
    let index = 0;

    const flushPlain = () => {
        if (plainLines.length) segments.push({ type: "markdown", text: plainLines.join("\n") });
        plainLines = [];
    };

    while (index < lines.length) {
        const line = lines[index];
        if (/^\s*```/.test(line)) inFence = !inFence;
        if (!inFence && index + 1 < lines.length && isTableLine(line) && isSeparatorLine(lines[index + 1])) {
            flushPlain();
            const headers = splitCells(line);
            index += 2;
            const rows = [];
            while (index < lines.length && isTableLine(lines[index]) && lines[index].trim()) {
                rows.push(splitCells(lines[index]));
                index += 1;
            }
            segments.push({ type: "table", headers, rows });
            continue;
        }
        plainLines.push(line);
        index += 1;
    }
    flushPlain();

    return segments.map((segment, segmentIndex) => segment.type === "table" ? (
        <div key={`table-${segmentIndex}`} className="my-4 max-w-full overflow-x-auto rounded-xl border border-white/[0.09] bg-black/[0.08]">
            <table className="w-full border-collapse text-left text-[12px]">
                <thead className="bg-white/[0.06] text-slate-100"><tr>{segment.headers.map((cell, i) => <th key={i} className="whitespace-nowrap border-b border-white/[0.09] px-3.5 py-2.5 font-semibold"><Markdown components={markdownComponents}>{cell}</Markdown></th>)}</tr></thead>
                <tbody>{segment.rows.map((row, rowIndex) => <tr key={rowIndex} className="even:bg-white/[0.025]">{segment.headers.map((_, columnIndex) => <td key={columnIndex} className="min-w-24 border-b border-white/[0.05] px-3.5 py-2.5 align-top text-slate-300"><Markdown components={markdownComponents}>{row[columnIndex] || ""}</Markdown></td>)}</tr>)}</tbody>
            </table>
        </div>
    ) : <Markdown key={`markdown-${segmentIndex}`} components={markdownComponents}>{segment.text}</Markdown>);
}

function MessageBubble({ role, content, images = [] }) {
    const isUser = role === "user";
    const resolveApiPath = (href) => href?.startsWith("/api/agent/") && api.defaults.baseURL
        ? new URL(href, api.defaults.baseURL).toString()
        : href;
    const validImages = !isUser && Array.isArray(images)
        ? images.filter((image) => typeof image === "string" && (/^https?:\/\//i.test(image) || image.startsWith("/api/agent/images/"))).slice(0, 6)
        : [];
    const hasGeneratedImage = validImages.some((image) => image.includes("/nexora/images/"));

    return (
        <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] min-w-0 px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed ${isUser
                ? "bg-gradient-to-br from-indigo-500 to-violet-700 text-white rounded-tr-sm"
                : "bg-white/[0.035] border border-white/[0.07] text-slate-300 rounded-tl-sm"
                }`}>
                {renderContent(content)}

                {validImages.length > 0 && (
                    <div className={`mt-4 grid gap-3 ${hasGeneratedImage ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
                        {validImages.map((image, index) => (
                            <a key={`${image}-${index}`} href={resolveApiPath(image)} target="_blank" rel="noreferrer" className={`group relative overflow-hidden rounded-xl border border-white/[0.1] bg-black/20 ${hasGeneratedImage ? "max-w-[560px]" : "aspect-[4/3]"}`}>
                                <img src={resolveApiPath(image)} alt={`Image result ${index + 1}`} loading="lazy" className={hasGeneratedImage ? "block max-h-[480px] w-full object-contain" : "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"} />
                                {!hasGeneratedImage && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-5 text-[10px] font-medium text-white/90">Image {index + 1}</span>}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MessageBubble;
