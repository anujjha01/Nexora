
import { useEffect } from "react";
import Home from "./pages/Home";
import getCurrentUser from "./features/getCurrentUser";
import { useDispatch } from "react-redux";
import { setUseradata } from "./redux/userSlice";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const getUser = async () => {
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

