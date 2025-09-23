import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import bgImg from "../../img/bg.png";
import logoImg from "../../img/logo.png";
import axios from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const LOGIN_URL = "/auth";

export default function Login() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const errRef = useRef();

  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const handleBack = () => {
    navigate("/");
  };

  useEffect(() => {
    setErrMsg("");
  }, [user, pwd]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${LOGIN_URL}/${user}/${pwd}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (res?.data.length === 0) {
        setErrMsg("Login Failed. Please try again later.");
      } else {
        const role = res?.data[0].role;
        setAuth({ user, pwd, role });
        setUser("");
        setPwd("");
        navigate(`/${role}`, { replace: true });
      }
    } catch (err) {
      if (!err?.response) {
        setErrMsg("Server is down. Please try again later.");
      } else if (err.response?.status === 400) {
        setErrMsg("Invalid username or password.");
      } else if (err.response?.status === 401) {
        setErrMsg("Unauthorized access.");
      } else {
        setErrMsg("Login Failed. Please try again later.");
      }
      errRef.current.focus();
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-gray-950 bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `linear-gradient(rgba(10,10,20,0.75),rgba(10,10,20,0.85)), url(${bgImg})`,
        backgroundSize: "contain",
      }}
    >
      <div className="w-full max-w-md mx-auto px-4 py-8">
        <div className="relative rounded-2xl p-1 mt-8 bg-gradient-to-tr from-primary-500 via-indigo-500 to-primary-400 animate-gradient-border">
          <div className="relative bg-gray-900/80 backdrop-blur-lg shadow-2xl rounded-2xl p-10 border border-gray-800">
            <div className="flex flex-col items-center mb-6">
              <img
                src={logoImg}
                alt="ProductGuard Logo"
                className="h-16 mb-2 drop-shadow-[0_0_16px_rgba(14,165,233,0.5)]"
              />
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
                ProductGuard
              </h1>
              <h2 className="text-lg font-semibold text-primary-400 mb-2">
                Sign in to your account
              </h2>
            </div>
            {errMsg && (
              <p ref={errRef} className="text-red-500 text-center mb-4">
                {errMsg}
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-700 rounded bg-gray-800"
                />
                <label
                  htmlFor="remember"
                  className="ml-2 block text-sm text-gray-400"
                >
                  Remember me
                </label>
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 rounded-lg font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg text-base transition-all duration-200"
              >
                Sign In
              </button>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm text-primary-400 hover:text-primary-300 underline"
                >
                  Back to Home
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
