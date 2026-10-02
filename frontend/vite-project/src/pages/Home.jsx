
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

function Home() {
  const { userData } = useSelector((state) => state.user);
  const { message = [] } = useSelector((state) => state.message);
  const dispatch = useDispatch();
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const latestAssistant = [...message].reverse().find((item) => item?.role === "assistant");
    if (typeof latestAssistant?.content === "string" && /```[^\n`]*\n[\s\S]*?```/.test(latestAssistant.content)) {
      setArtifactOpen(true);
    }
  }, [message]);

  const handleLogin = async (token) => {
    try {
      const { data } = await api.post("/api/auth/login", { token });
      dispatch(setUseradata(data?.user || data));
    } catch (error) {
      console.log("Backend login error:", error);
    }
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
      await handleLogin(token);
    } catch (error) {
      console.log("Google login error:", error);
      setLoginError(error.message || "Google sign-in failed. Please try again.");
    }
  };

  return (
    <div className="w-full h-screen flex bg-[#0d0f14] text-white overflow-hidden">
      <SideBar />
      <ChatArea artifactOpen={artifactOpen} onToggleArtifact={() => setArtifactOpen((open) => !open)} />
      <Artifact open={artifactOpen} onClose={() => setArtifactOpen(false)} />

      {!userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5">
            <div className="flex flex-col gap-1 items-center text-center">
              <h2 className="text-[17px] font-semibold text-slate-100 tracking-tight">
                Welcome to Nexora_AI
              </h2>
              <p className="text-[13px] text-slate-500">
                Please login to continue using the app.
              </p>
            </div>
            <button
              className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-black/90 bg-white hover:bg-gray-200 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              onClick={googleLogin}
              disabled={!auth || !googleProvider}
            >
              <FcGoogle size={15} />
              Continue With Google
            </button>
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
