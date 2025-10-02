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
      {/* Show customer support for authenticated users (supports auth.user or auth.username) */}
      {(auth?.username || auth?.user) && auth?.role !== "manufacturer" && (
        <CustomerSupport user={auth} />
      )}
    </main>
  );
};

export default Layout;
