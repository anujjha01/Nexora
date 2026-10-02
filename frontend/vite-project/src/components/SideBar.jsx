import { useState, useEffect } from "react";
import {
  Coins,
  LogIn,
  LogOut,
  MessagesSquare,
  PanelLeftIcon,
  PenSquare,
  Plus,
  User,
  Trash2,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import getMessages from "../features/getMessages";
import { getConversation } from "../features/getConversations";
import {
  setConversation,
  addConversation,
  setSelectedConversation,
  removeConversation,
} from "../redux/conversationSlice";
import { createConversation } from "../features/createConversation";
import { deleteConversationApi } from "../features/deleteConversation";
import { setMessage } from "../redux/messageSlice";
import logout from "../features/logOut";
import { setUseradata } from "../redux/userSlice"


function SideBar({ mobileOpen = false, onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const [imageError, setImageError] = useState(false);
  const { conversation = [], selectedConversation } = useSelector(
    (state) => state.conversation,
  );
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    const getConvo = async () => {
      try {
        const data = await getConversation();
        dispatch(setConversation(data));
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    getConvo();
  }, [userData?.id, dispatch]);

  const handleCreateConversation = async () => {
    try {
      const data = await createConversation();
      if (data) {
        dispatch(addConversation(data));
        const conversationData = data?.conversation || data?.data || data;
        dispatch(setSelectedConversation(conversationData));
        dispatch(setMessage([]));
        onCloseMobile?.();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      dispatch(setUseradata(null));
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 h-[100dvh] w-[min(84vw,300px)] shrink-0 border-r border-white/[0.06] bg-[#0d0f14] transition-all duration-300 lg:static lg:h-full lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:w-[68px]" : "lg:w-[270px]"}`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]">
          <div
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftIcon size={16} />
          </div>

          <button type="button" aria-label="Close navigation menu" onClick={onCloseMobile} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white lg:hidden">
            <X size={17} />
          </button>

          {!collapsed && (
            <>
              <img
                src="/nexora-logo-horizontal.png"
                alt="Nexora AI"
                className="h-8 min-w-0 flex-1 object-contain object-left mix-blend-lighten"
              />
              <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide">
                Free
              </span>
              <button
                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                onClick={handleCreateConversation}
              >
                <PenSquare size={14} />
              </button>
            </>
          )}
        </div>

        {/* New Chat Button */}
        <div className="px-4 pt-4 pb-1">
          <button
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-gradient-to-br from-indigo-500 to-violet-700 rounded-xl py-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity duration-150"
            onClick={handleCreateConversation}
          >
            <Plus size={15} />
            {!collapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Section Header */}
        {!collapsed && (
          <div className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600">
            {conversation.length === 0
              ? "No recent conversation"
              : "Recent Chats"}
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {conversation.map((conv, i) => {
            const isActive = selectedConversation?._id === conv?._id;
            return (
              <div
                key={conv?._id || i}
                onClick={async () => {
                  dispatch(setSelectedConversation(conv));
                  dispatch(setMessage([])); // prevent visual flicker of old chat
                  const data = await getMessages(conv?._id);
                  dispatch(setMessage(data));
                  onCloseMobile?.();
                }}
                className={`group flex items-center justify-between cursor-pointer mb-0.5 px-3 py-2.5 rounded-[10px] border transition-colors duration-150 ${isActive
                  ? "bg-indigo-500/10 border-indigo-500/[0.18]"
                  : "bg-transparent border-transparent hover:bg-white/[0.04]"
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-lg transition-colors duration-150 ${isActive ? "text-indigo-400" : "text-slate-500"
                      }`}
                  >
                    <MessagesSquare size={16} />
                  </div>

                  {!collapsed && (
                    <span
                      className={`text-sm truncate ${isActive
                        ? "text-indigo-200 font-medium"
                        : "text-slate-300"
                        }`}
                    >
                      {conv?.title || "New Chat"}
                    </span>
                  )}
                </div>

                {!collapsed && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await deleteConversationApi(conv._id);
                      dispatch(removeConversation(conv._id));
                      if (isActive) {
                        dispatch(setSelectedConversation(null));
                        dispatch(setMessage([])); // Clear messages for this deleted active chat
                      }
                    }}
                    className="hidden group-hover:flex items-center justify-center w-7 h-7 shrink-0 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/[0.08] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-2.5 h-px bg-white/[0.06]" />

        {/* Footer Section */}
        <div className="px-3.5 py-3.5">
          {userData ? (
            <div className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 hover:bg-white/[0.05] transition-colors duration-150">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Avatar */}
                <div className="relative shrink-0 flex items-center justify-center">
                  {userData?.avatar && !imageError ? (
                    <img
                      className="w-9 h-9 rounded-[10px] object-cover border border-indigo-500/25"
                      src={userData.avatar}
                      alt={userData?.name || "User Avatar"}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                      <User size={15} className="text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Name & Subtitle */}
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-slate-100 truncate">
                      {userData?.name || "user"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-px truncate">
                      Free Plan
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!collapsed && (
                <div className="flex items-center gap-1 shrink-0">
                  <button className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150">
                    <Coins size={16} />
                  </button>
                  <button
                    className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-300 bg-white/[0.05] hover:bg-white/[0.08] py-2.5 px-3 rounded-xl border border-white/[0.08] transition-colors duration-150 cursor-pointer">
              <LogIn size={15} />
              {!collapsed && <span>Login</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SideBar;
