
import { useEffect } from "react";
import Home from "./pages/Home";
import getCurrentUser from "./features/getCurrentUser";
import { useDispatch } from "react-redux";
import { setUseradata } from "./redux/userSlice";
import { auth } from "../utils/firebase";
import api from "../utils/axios";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;
    const restoreUser = async () => {
      localStorage.removeItem("nexora-demo-user");
      if (localStorage.getItem("nexora-logged-out") === "true") {
        if (active) dispatch(setUseradata(null));
        return;
      }

      const currentUser = await getCurrentUser();
      if (currentUser) {
        if (active) dispatch(setUseradata(currentUser));
        return;
      }

      // Hosted free Redis may restart and clear app sessions. Firebase keeps
      // the user's sign-in on this device, so silently issue a fresh app session.
      if (auth) {
        try {
          await auth.authStateReady();
          if (auth.currentUser) {
            const token = await auth.currentUser.getIdToken();
            const { data } = await api.post("/api/auth/login", { token });
            const user = data?.user || data;
            if (active && user && (user.id || user._id || user.userID)) {
              localStorage.removeItem("nexora-logged-out");
              dispatch(setUseradata(user));
              return;
            }
          }
        } catch (error) {
          console.error("Could not restore the Nexora session:", error);
        }
      }
      if (active) dispatch(setUseradata(null));
    };

    restoreUser();
    return () => { active = false; };
  }, [dispatch]);

  return (
    <>
      <Home />
    </>
  );
}

export default App;

