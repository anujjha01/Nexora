import api from '../../utils/axios'
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase";

async function logout() {
  localStorage.setItem("nexora-logged-out", "true");
  try {
    await api.get("/api/auth/logout");
  } catch (error) {
    console.error("Could not clear the Nexora server session:", error);
  } finally {
    if (auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Could not sign out of Firebase:", error);
      }
    }
  }
}

export default logout
