import { MessageSquare, PanelRight, PanelRightClose } from "lucide-react"
import { useSelector } from "react-redux"

function Nav({ artifactOpen, onToggleArtifact }) {
  const { selectedConversation } = useSelector(state => state.conversation)
  const { message } = useSelector(state => state.message)
  return (
    <>
      {selectedConversation && <div className='h-14 flex items-center gap-2.5 px-5 border-white/[0.06] bg-[#0d0f14] border-b'>
        <div className='flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20'>
          <MessageSquare size={13} className='text-indigo-400' />
        </div>
        <div className='text-[14px] font-semibold text-slate-100 tracking-tight'>
          {selectedConversation?.title || "New Chat"}
        </div>
        <div className='text-[10px] font-medium text-slate-600 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full'>
          {message?.length} Messages
        </div>
        <button
          type="button"
          onClick={onToggleArtifact}
          aria-pressed={artifactOpen}
          title={artifactOpen ? "Close artifacts" : "Open code and preview"}
          className={`ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${artifactOpen ? "border-violet-400/25 bg-violet-400/10 text-violet-200" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"}`}
        >
          {artifactOpen ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
          Artifacts
        </button>
      </div>}

    </>
  )
}

export default Nav
