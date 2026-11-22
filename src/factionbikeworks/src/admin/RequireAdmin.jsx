import { Navigate } from "react-router";
import { useSession } from "../lib/store";
import { Loader } from "../components/ui/Bits";

export default function RequireAdmin({ children }) {
  const { user, checking } = useSession();
  if (checking) return <Loader label="Checking your access" />;
  if (!user || user.category !== "Admin") return <Navigate to="/" replace />;
  return children;
}
