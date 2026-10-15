
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
import { ArrowRight, Code2, FileText, Image, MessageSquare, Sparkles } from "lucide-react";

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
    userData ? (
      <div style={{ height: "var(--nexora-viewport-height, 100dvh)" }} className="flex min-h-0 w-full overflow-hidden bg-[#0d0f14] text-white">
        <SideBar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
        {mobileSidebarOpen && <button type="button" aria-label="Close navigation menu" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden" />}
        <ChatArea artifactOpen={artifactOpen} onToggleArtifact={() => setArtifactOpen((open) => !open)} onOpenArtifact={() => setArtifactOpen(true)} onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <Artifact open={artifactOpen} onClose={() => setArtifactOpen(false)} />
      </div>
    ) : (
      <main className="relative min-h-[100dvh] overflow-hidden bg-[#090b10] text-white selection:bg-violet-400/30">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-56 left-1/2 h-[540px] w-[780px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[130px]" />
          <div className="absolute right-[-12rem] top-[32rem] h-80 w-80 rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        </div>
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <a href="#top" className="flex items-center font-semibold tracking-tight" aria-label="Nexora AI home">
            <span className="text-[17px]">Nexora<span className="text-violet-300"> AI</span></span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#how-it-works" className="transition hover:text-white">How it works</a>
          </div>
          <button onClick={googleLogin} disabled={!auth || !googleProvider || isSigningIn || isWakingBackend} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-3.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60 sm:px-4">
            {isSigningIn && !isEnteringDemo ? "Connecting…" : "Sign in"}<ArrowRight size={15} />
          </button>
        </header>

        <section id="top" className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_.9fr] lg:gap-16 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-300/[.07] px-3 py-1.5 text-xs font-medium text-violet-200 sm:text-sm"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Your ideas, with a little more intelligence</div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl lg:text-[3.8rem]">A calmer workspace<br className="hidden sm:block" /> for <span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-blue-300 bg-clip-text text-transparent">big ideas.</span></h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-slate-400 sm:text-lg sm:leading-8 lg:mx-0">Chat, create, and get things done with AI tools in one thoughtful workspace. Bring a question, a document, or just a rough idea.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <button onClick={googleLogin} disabled={!auth || !googleProvider || isSigningIn || isWakingBackend} className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 shadow-xl shadow-violet-950/20 transition hover:-translate-y-0.5 hover:bg-violet-50 disabled:opacity-60 sm:text-base">
                <FcGoogle size={19} />{isWakingBackend && !isEnteringDemo ? "Waking Nexora up…" : isSigningIn && !isEnteringDemo ? "Opening Google sign-in…" : "Continue with Google"}
              </button>
              <button type="button" onClick={enterDemo} disabled={isSigningIn} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-5 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60 sm:text-base">
                {isEnteringDemo ? "Starting your workspace…" : "Explore the demo"}<ArrowRight size={16} />
              </button>
            </div>
            {isSigningIn && !isWakingBackend && <p role="status" aria-live="polite" className="mt-4 text-sm text-slate-300">Complete the Google sign-in window to continue.</p>}
            {isWakingBackend && <p role="status" aria-live="polite" className="mt-4 text-sm text-slate-300">{isEnteringDemo ? "Starting the demo workspace. The backend may take a moment to wake up." : "Connecting your account. The backend may take a moment to wake up."}</p>}
            {(!auth || !googleProvider || loginError) && <p role="alert" className="mx-auto mt-4 max-w-xl text-sm leading-6 text-amber-300 lg:mx-0">{loginError || "Google sign-in needs the Firebase web API key to be configured."}</p>}
            <p className="mt-5 text-xs text-slate-500">Demo opens a temporary workspace. No account needed.</p>
          </div>

          <div id="how-it-works" className="relative mx-auto w-full max-w-[520px] lg:ml-auto">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-violet-500/20 via-blue-500/10 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]/95 p-3 shadow-2xl shadow-black/50 sm:rounded-3xl sm:p-4">
              <div className="flex items-center gap-2 border-b border-white/[.07] px-2 pb-3 sm:px-3"><span className="h-2 w-2 rounded-full bg-rose-400/80" /><span className="h-2 w-2 rounded-full bg-amber-300/80" /><span className="h-2 w-2 rounded-full bg-emerald-400/80" /><span className="ml-2 text-xs text-slate-500">Your Nexora workspace</span></div>
              <div className="grid min-h-[270px] grid-cols-[88px_1fr] sm:min-h-[330px] sm:grid-cols-[132px_1fr]">
                <div className="border-r border-white/[.07] p-2 sm:p-3"><div className="mb-4 flex items-center gap-1.5 text-[10px] font-semibold text-slate-300 sm:text-xs"><Sparkles size={13} className="text-violet-300" /> Nexora AI</div><div className="mb-2 rounded-lg bg-white/[.07] px-2 py-2 text-[9px] text-slate-300 sm:text-[11px]">+ New chat</div><div className="space-y-2 px-1 pt-2 text-[8px] text-slate-500 sm:text-[10px]"><div className="truncate">Ideas for my project</div><div className="truncate">Summarize this report</div><div className="truncate">Weekend itinerary</div></div></div>
                <div className="flex flex-col justify-between p-3 sm:p-5"><div><div className="mb-5 text-center"><div className="text-sm font-semibold text-slate-100 sm:text-base">What can I help you with?</div><div className="mt-1 text-[9px] text-slate-500 sm:text-[11px]">Ask, make, learn, and explore.</div></div><div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-500/20 px-3 py-2 text-[9px] leading-relaxed text-violet-100 sm:text-xs">Help me turn this idea into a simple plan.</div><div className="mt-3 max-w-[90%] rounded-2xl rounded-bl-md border border-white/[.07] bg-white/[.035] px-3 py-2.5 text-[9px] leading-relaxed text-slate-300 sm:text-xs">Absolutely. Let’s start with the goal, then break it into a few clear next steps.<div className="mt-3 h-1.5 w-4/5 rounded-full bg-white/10" /><div className="mt-1.5 h-1.5 w-3/5 rounded-full bg-white/[.07]" /></div></div><div className="rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-[9px] text-slate-600 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-[11px]">Message Nexora… <span className="float-right rounded-md bg-violet-500/80 px-1.5 py-1 text-white">↑</span></div></div>
              </div>
            </div>
            <div className="relative mt-4 grid grid-cols-3 gap-2 sm:absolute sm:-bottom-5 sm:-left-7 sm:mt-0 sm:gap-3">
              {[{ Icon: MessageSquare, label: "Chat" }, { Icon: Image, label: "Create" }, { Icon: FileText, label: "Work with files" }].map(({ Icon, label }) => <div key={label} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#141722]/95 px-2 py-2.5 text-[9px] text-slate-300 shadow-xl backdrop-blur sm:gap-2 sm:px-3 sm:py-3 sm:text-[11px]"><Icon size={13} className="shrink-0 text-violet-300 sm:h-4 sm:w-4" />{label}</div>)}
            </div>
          </div>
        </section>

        <section id="features" className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">One workspace, more possibilities</p><h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Everything you need to get moving</h2></div><span className="hidden text-xs text-slate-500 sm:block">Built for the way ideas happen</span></div>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {[{ Icon: MessageSquare, title: "Think out loud", body: "Explore questions, get explanations, and turn scattered thoughts into a clear next step." }, { Icon: Code2, title: "Make things", body: "Draft code, shape new ideas, and create useful first versions faster." }, { Icon: FileText, title: "Bring your work", body: "Use your files and notes as a starting point for focused, helpful conversations." }].map(({ Icon, title, body }) => <article key={title} className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5 transition hover:border-violet-300/20 hover:bg-white/[.04] sm:p-6"><span className="mb-4 grid h-9 w-9 place-items-center rounded-xl border border-violet-300/10 bg-violet-300/[.08] text-violet-200"><Icon size={17} /></span><h3 className="text-sm font-semibold text-slate-100 sm:text-base">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-400 sm:text-sm">{body}</p></article>)}
          </div>
        </section>
        <footer className="relative z-10 border-t border-white/[.07] px-5 py-5 text-center text-xs text-slate-500 sm:px-8">Nexora AI <span className="mx-1.5 text-slate-700">·</span> A little more room to think.</footer>
      </main>
    )
  );
}

export default Home;
