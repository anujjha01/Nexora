
import { useEffect } from "react";
import Home from "./pages/Home";
import getCurrentUser from "./features/getCurrentUser";
import { useDispatch } from "react-redux";
import { setUseradata } from "./redux/userSlice";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const getUser = async () => {
      const savedDemoUser = localStorage.getItem("nexora-demo-user");
      if (savedDemoUser) {
        try {
          dispatch(setUseradata(JSON.parse(savedDemoUser)));
          return;
        } catch {
          localStorage.removeItem("nexora-demo-user");
        }
      }
      const data = await getCurrentUser();
      dispatch(setUseradata(data));
    };

    getUser();
  }, [dispatch]);

  return (
    <>
      <Home />
    </>
  );
}

export default App;

