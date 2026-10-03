import { Menu, MessageSquare, PanelRight, PanelRightClose } from "lucide-react"
import { useSelector } from "react-redux"

function Nav({ artifactOpen, onToggleArtifact, onOpenSidebar }) {
  const { selectedConversation } = useSelector(state => state.conversation)
  const { message } = useSelector(state => state.message)
  return (
    <>
      <header className={`flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0d0f14] px-3 sm:gap-2.5 sm:px-5 ${selectedConversation ? "" : "lg:hidden"}`}>
        <button type="button" aria-label="Open navigation menu" onClick={onOpenSidebar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white lg:hidden">
          <Menu size={19} />
        </button>
        <span className="shrink-0 text-sm font-semibold tracking-tight text-slate-100 lg:hidden">Nexora AI</span>
        <div className='hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 sm:flex'>
          <MessageSquare size={13} className='text-indigo-400' />
        </div>
        {selectedConversation ? <>
          <div className='min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-slate-100 sm:text-[14px]'>
            {selectedConversation?.title || "New Chat"}
          </div>
          <div className='hidden shrink-0 rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-500 sm:block'>
            {message?.length} Messages
          </div>
        </> : <span className="hidden text-base font-semibold tracking-tight text-slate-100 sm:block lg:hidden">Nexora AI</span>}
        {selectedConversation && <button
          type="button"
          onClick={onToggleArtifact}
          aria-pressed={artifactOpen}
          title={artifactOpen ? "Close artifacts" : "Open code and preview"}
          className={`ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${artifactOpen ? "border-violet-400/25 bg-violet-400/10 text-violet-200" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"}`}
        >
          {artifactOpen ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
          Artifacts
        </button>}
      </header>

    </>
  )
}

export default Nav
