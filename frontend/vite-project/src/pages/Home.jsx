
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase";
import api from "../../utils/axios";
import { FcGoogle } from "react-icons/fc";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { setUseradata } from "../redux/userSlice";
import SideBar from "../components/SideBar";
import ChatArea from "../components/ChatArea";
import Artifact from "../components/Artifact";

function Home() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const signInInProgress = useRef(false);
  const demoSelectedDuringSignIn = useRef(false);
  const [isWakingBackend, setIsWakingBackend] = useState(false);

  const handleLogin = async (token, shouldCancel = () => false) => {
    const { data } = await api.post("/api/auth/login", { token });
    const user = data?.user || data;

    if (!user || typeof user !== "object" || (!user.id && !user._id && !user.userID)) {
      throw new Error("Sign-in succeeded, but Nexora could not create your app session. Please try again.");
    }

    if (shouldCancel()) return;
    localStorage.removeItem("nexora-demo-user");
    dispatch(setUseradata(user));
  };

  const googleLogin = async () => {
    // Firebase cancels an earlier popup if a second popup is opened on the
    // same Auth instance. Lock synchronously to prevent double-click races.
    if (signInInProgress.current) return;
    if (!auth || !googleProvider) {
      setLoginError("Google sign-in is not configured. Add VITE_FIREBASE_API_KEY to the deployment environment.");
      return;
    }

    signInInProgress.current = true;
    demoSelectedDuringSignIn.current = false;
    setIsSigningIn(true);
    setLoginError("");
    try {
      const data = await signInWithPopup(auth, googleProvider);
      const token = await data.user.getIdToken();
      setIsWakingBackend(true);
      await handleLogin(token, () => demoSelectedDuringSignIn.current);
    } catch (error) {
      const backendMessage = error.response?.data?.message;
      const firebaseMessages = {
        "auth/cancelled-popup-request": "A Google sign-in window was already open. Finish that window or click the button again.",
        "auth/popup-closed-by-user": "Google sign-in was cancelled. Click the button to try again.",
        "auth/popup-blocked": "Your browser blocked Google's sign-in window. Allow pop-ups for this site, then try again.",
        "auth/unauthorized-domain": `Google sign-in is not enabled for ${window.location.hostname}. Add this exact domain in Firebase Authentication settings under Authorized domains.`,
        "auth/operation-not-allowed": "Google sign-in is disabled for this Firebase project. Enable the Google provider in Firebase Authentication settings.",
        "auth/network-request-failed": "Google sign-in could not reach Firebase. Check your connection and try again.",
      };
      setLoginError(
        firebaseMessages[error.code]
          || backendMessage
          || (error.code === "ERR_NETWORK"
            ? "Nexora could not reach the sign-in service. Please try again, or choose the demo account."
            : "Google sign-in could not finish. Please try again.")
      );
    } finally {
      setIsWakingBackend(false);
      setIsSigningIn(false);
      signInInProgress.current = false;
    }
  };

  const enterDemo = () => {
    demoSelectedDuringSignIn.current = true;
    const demoUser = {
      id: "nexora-demo-user",
      name: "Demo User",
      email: "demo@nexora.local",
      isDemo: true,
    };
    if (!localStorage.getItem("nexora-demo-chats")) {
      localStorage.setItem("nexora-demo-chats", JSON.stringify([{
        _id: "demo-welcome",
        title: "Welcome to Nexora",
        messages: [
          { role: "user", content: "What can I do in this demo?" },
          { role: "assistant", content: "Explore the Nexora chat workspace, start new chats, and try the suggested prompts. Your demo conversations are saved in this browser. You can generate images in the demo; live AI and document tools require signing in." },
        ],
      }]));
    }
    localStorage.setItem("nexora-demo-user", JSON.stringify(demoUser));
    dispatch(setUseradata(demoUser));
    setLoginError("");
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
              disabled={!auth || !googleProvider || isSigningIn || isWakingBackend}
            >
              <FcGoogle size={15} />
              {isWakingBackend ? "Waking Nexora up..." : isSigningIn ? "Opening Google sign-in..." : "Continue With Google"}
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-indigo-400/25 bg-indigo-500/10 py-[11px] text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/20 disabled:opacity-60"
              onClick={enterDemo}
              disabled={isSigningIn && !isWakingBackend}
            >
              Try demo account
            </button>
            <p className="-mt-3 text-center text-[11px] leading-relaxed text-slate-500">
              Opens instantly with local sample chats. Demo chats stay on this device.
            </p>
            {isSigningIn && !isWakingBackend && (
              <p role="status" aria-live="polite" className="text-center text-xs leading-relaxed text-slate-300">
                Complete the Google sign-in window to continue.
              </p>
            )}
            {isWakingBackend && (
              <p role="status" aria-live="polite" className="text-center text-xs leading-relaxed text-slate-300">
                Nexora is connecting your account. The free backend can take a little while to wake up.
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
