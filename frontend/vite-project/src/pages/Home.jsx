
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase";
import api from "../../utils/axios";
import { FcGoogle } from "react-icons/fc";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { setUseradata } from "../redux/userSlice";
import SideBar from "../components/SideBar";
import ChatArea from "../components/ChatArea";
import Artifact from "../components/Artifact";

const authRetryDelays = [1000, 2500, 5000, 8000, 12000];

const postAuthRequest = async (path, body) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await api.post(path, body);
    } catch (error) {
      const retryable = !error.response || [502, 503, 504].includes(error.response.status);
      if (!retryable || attempt >= authRetryDelays.length) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, authRetryDelays[attempt]));
    }
  }
};

function Home() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isEnteringDemo, setIsEnteringDemo] = useState(false);
  const signInInProgress = useRef(false);
  const demoSelectedDuringSignIn = useRef(false);
  const [isWakingBackend, setIsWakingBackend] = useState(false);

  useEffect(() => {
    const updateViewportHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--nexora-viewport-height", `${height}px`);
    };
    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    window.visualViewport?.addEventListener("resize", updateViewportHeight);
    window.visualViewport?.addEventListener("scroll", updateViewportHeight);
    return () => {
      window.removeEventListener("resize", updateViewportHeight);
      window.visualViewport?.removeEventListener("resize", updateViewportHeight);
      window.visualViewport?.removeEventListener("scroll", updateViewportHeight);
      document.documentElement.style.removeProperty("--nexora-viewport-height");
    };
  }, []);

  const handleLogin = async (token, shouldCancel = () => false) => {
    const { data } = await postAuthRequest("/api/auth/login", { token });
    const user = data?.user || data;

    if (!user || typeof user !== "object" || (!user.id && !user._id && !user.userID)) {
      throw new Error("Sign-in succeeded, but Nexora could not create your app session. Please try again.");
    }

    if (shouldCancel()) return;
    localStorage.removeItem("nexora-logged-out");
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
    setIsEnteringDemo(false);
    setLoginError("");
    try {
      const isMobile = Boolean(window.matchMedia?.("(max-width: 640px), (pointer: coarse)").matches)
        || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        // Mobile browsers and embedded webviews often block popup callbacks.
        await signInWithRedirect(auth, googleProvider);
        return;
      }
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
        "auth/invalid-api-key": "Google sign-in is using an invalid Firebase API key. Check VITE_FIREBASE_API_KEY in the Vercel project and redeploy.",
        "auth/web-storage-unsupported": "This browser is blocking the storage Google sign-in needs. Enable cookies and site storage, then try again.",
        "auth/too-many-requests": "Google temporarily blocked sign-in attempts from this device. Wait a little and try again.",
        "auth/internal-error": "Firebase could not complete Google sign-in. Check that the Google provider is enabled and this site is listed under Firebase Authentication authorized domains.",
      };
      setLoginError(
        firebaseMessages[error.code]
          || backendMessage
          || (error.code === "ERR_NETWORK"
            ? "Nexora could not reach the sign-in service. Please try again, or choose the demo account."
            : error.code
              ? `Google sign-in failed (${error.code}). Please check the Firebase Authentication settings and try again.`
              : error.message || "Google sign-in could not finish. Please try again.")
      );
    } finally {
      setIsWakingBackend(false);
      setIsSigningIn(false);
      signInInProgress.current = false;
    }
  };

  const enterDemo = async () => {
    if (signInInProgress.current) return;
    demoSelectedDuringSignIn.current = true;
    signInInProgress.current = true;
    setIsSigningIn(true);
    setIsEnteringDemo(true);
    setIsWakingBackend(true);
    setLoginError("");
    try {
      const { data } = await postAuthRequest("/api/auth/demo", {});
      if (!data?.user?.userID) throw new Error("The demo session could not be created. Please try again.");
      localStorage.removeItem("nexora-demo-user");
      localStorage.removeItem("nexora-logged-out");
      dispatch(setUseradata(data.user));
    } catch (error) {
      setLoginError(error.response?.data?.message || error.message || "The demo account could not start. Please try again.");
    } finally {
      signInInProgress.current = false;
      setIsSigningIn(false);
      setIsEnteringDemo(false);
      setIsWakingBackend(false);
    }
  };

  return (
    <div style={{ height: "var(--nexora-viewport-height, 100dvh)" }} className="flex min-h-0 w-full overflow-hidden bg-[#0d0f14] text-white">
      <SideBar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
      {mobileSidebarOpen && <button type="button" aria-label="Close navigation menu" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden" />}
      <ChatArea artifactOpen={artifactOpen} onToggleArtifact={() => setArtifactOpen((open) => !open)} onOpenArtifact={() => setArtifactOpen(true)} onOpenSidebar={() => setMobileSidebarOpen(true)} />
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
              {isWakingBackend && !isEnteringDemo ? "Waking Nexora up..." : isSigningIn ? "Opening Google sign-in..." : "Continue With Google"}
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-indigo-400/25 bg-indigo-500/10 py-[11px] text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/20 disabled:opacity-60"
              onClick={enterDemo}
              disabled={isSigningIn}
            >
              {isEnteringDemo ? "Starting demo workspace…" : "Try demo account"}
            </button>
            <p className="-mt-3 text-center text-[11px] leading-relaxed text-slate-500">
              Try the full Nexora workspace with an isolated temporary account.
            </p>
            {isSigningIn && !isWakingBackend && (
              <p role="status" aria-live="polite" className="text-center text-xs leading-relaxed text-slate-300">
                Complete the Google sign-in window to continue.
              </p>
            )}
            {isWakingBackend && (
              <p role="status" aria-live="polite" className="text-center text-xs leading-relaxed text-slate-300">
                {isEnteringDemo
                  ? "Starting your demo workspace. The free backend can take a little while to wake up."
                  : "Nexora is connecting your account. The free backend can take a little while to wake up."}
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
