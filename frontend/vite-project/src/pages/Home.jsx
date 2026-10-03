
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase";
import api from "../../utils/axios";
import { FcGoogle } from "react-icons/fc";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { setUseradata } from "../redux/userSlice";
import SideBar from "../components/SideBar";
import ChatArea from "../components/ChatArea";
import Artifact from "../components/Artifact";

const BACKEND_HEALTH_URL = "https://nexora-ai-api-mqqk.onrender.com/health";
const BACKEND_STARTUP_LIMIT_MS = 90_000;
const HEALTH_CHECK_INTERVAL_MS = 5_000;

async function waitForBackend(onWait) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < BACKEND_STARTUP_LIMIT_MS) {
    const remainingSeconds = Math.max(0, Math.ceil((BACKEND_STARTUP_LIMIT_MS - (Date.now() - startedAt)) / 1000));
    onWait(remainingSeconds);

    try {
      const response = await fetch(BACKEND_HEALTH_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) return;
    } catch {
      // A sleeping free Render service may not respond until it has started.
    }

    await new Promise((resolve) => window.setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
  }

  throw new Error("The backend is taking longer than expected to wake up. Please wait a little and try again.");
}

function Home() {
  const { userData } = useSelector((state) => state.user);
  const { message = [] } = useSelector((state) => state.message);
  const dispatch = useDispatch();
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isWakingBackend, setIsWakingBackend] = useState(false);
  const [wakeSecondsLeft, setWakeSecondsLeft] = useState(null);

  useEffect(() => {
    const latestAssistant = [...message].reverse().find((item) => item?.role === "assistant");
    if (typeof latestAssistant?.content === "string" && /```[^\n`]*\n[\s\S]*?```/.test(latestAssistant.content)) {
      setArtifactOpen(true);
    }
  }, [message]);

  const handleLogin = async (token) => {
    const { data } = await api.post("/api/auth/login", { token });
    const user = data?.user || data;

    if (!user || typeof user !== "object" || (!user.id && !user._id && !user.userID)) {
      throw new Error("Sign-in succeeded, but Nexora could not create your app session. Please try again.");
    }

    dispatch(setUseradata(user));
  };

  const googleLogin = async () => {
    if (!auth || !googleProvider) {
      setLoginError("Google sign-in is not configured. Add VITE_FIREBASE_API_KEY to the deployment environment.");
      return;
    }

    setLoginError("");
    try {
      const data = await signInWithPopup(auth, googleProvider);
      const token = await data.user.getIdToken();
      setIsWakingBackend(true);
      await waitForBackend(setWakeSecondsLeft);
      await handleLogin(token);
    } catch (error) {
      console.log("Google login error:", error);
      const backendMessage = error.response?.data?.message;
      const isStartupTimeout = error.message?.includes("taking longer than expected");
      setLoginError(isStartupTimeout
        ? error.message
        : backendMessage || error.message || "Google sign-in failed. Please try again.");
    } finally {
      setIsWakingBackend(false);
      setWakeSecondsLeft(null);
    }
  };

  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-[#0d0f14] text-white">
      <SideBar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
      {mobileSidebarOpen && <button type="button" aria-label="Close navigation menu" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden" />}
      <ChatArea artifactOpen={artifactOpen} onToggleArtifact={() => setArtifactOpen((open) => !open)} onOpenSidebar={() => setMobileSidebarOpen(true)} />
      <Artifact open={artifactOpen} onClose={() => setArtifactOpen(false)} />

      {!userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-[340px] flex-col gap-5 rounded-2xl border border-white/[0.08] bg-[#13151c] p-6 sm:p-7">
            <div className="flex flex-col gap-1 items-center text-center">
              <h2 className="text-[17px] font-semibold text-slate-100 tracking-tight">
                Welcome to Nexora AI
              </h2>
              <p className="text-[13px] text-slate-500">
                Please login to continue using the app.
              </p>
            </div>
            <button
              className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-black/90 bg-white hover:bg-gray-200 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              onClick={googleLogin}
              disabled={!auth || !googleProvider || isWakingBackend}
            >
              <FcGoogle size={15} />
              {isWakingBackend ? "Waking Nexora up..." : "Continue With Google"}
            </button>
            {isWakingBackend && (
              <p role="status" aria-live="polite" className="text-center text-xs leading-relaxed text-slate-300">
                The free backend may be asleep. Waking it now; this usually takes about a minute
                {wakeSecondsLeft !== null ? ` (up to ${Math.ceil(wakeSecondsLeft / 60)} min remaining)` : ""}.
                Keep this page open.
              </p>
            )}
            {(!auth || !googleProvider || loginError) && (
              <p role="alert" className="text-center text-xs leading-relaxed text-amber-300">
                {loginError || "Google sign-in needs the Firebase web API key to be configured."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
