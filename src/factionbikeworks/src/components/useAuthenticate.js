import { useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const useAuthenticate = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/account/authenticate`, {
          withCredentials: true,
        });
        const user = response.data.user;
        localStorage.setItem("userId", user.id); // Save userId to localStorage
      } catch (error) {
        console.error("Authentication failed:", error);
        navigate("/login"); // Redirect to login page if not authenticated
      }
    };

    authenticateUser();
  }, [navigate]);
};

export default useAuthenticate;
