import { Outlet } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "../context/AuthProvider";
import CustomerSupport from "./CustomerSupport";

const Layout = () => {
  const { auth } = useContext(AuthContext);

  return (
    <main className="min-h-screen bg-gray-50 w-full">
      <div className="w-full px-0 py-0">
        <Outlet />
      </div>
      {/* CustomerSupport floating chat overlay removed */}
    </main>
  );
};

export default Layout;
