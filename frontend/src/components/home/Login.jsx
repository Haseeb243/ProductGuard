import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import bgImg from "../../img/bg.png";
import logoImg from "../../img/logo.png";
import axios from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const LOGIN_URL = "/auth/login";

export default function Login() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const errRef = useRef();

  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    navigate("/");
  };

  useEffect(() => {
    setErrMsg("");
  }, [user, pwd, twoFactorToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestData = { username: user, password: pwd };
      if (showTwoFactor) {
        requestData.twoFactorToken = twoFactorToken;
      }

      const res = await axios.post(LOGIN_URL, requestData, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.data.requiresTwoFactor) {
        setShowTwoFactor(true);
        setErrMsg("");
      } else if (res.data.success) {
        const { token, user: userData } = res.data;

        // Store token in localStorage and set axios default header
        localStorage.setItem("authToken", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        setAuth({
          user: userData.username,
          role: userData.role,
          token,
          userId: userData.id,
          email: userData.email,
          is2FAEnabled: userData.is_2fa_enabled,
        });

        setUser("");
        setPwd("");
        setTwoFactorToken("");
        navigate(`/${userData.role}`, { replace: true });
      } else {
        setErrMsg(res.data.message || "Login failed");
      }
    } catch (err) {
      if (!err?.response) {
        setErrMsg("Server is down. Please try again later.");
      } else if (err.response?.status === 400) {
        setErrMsg(err.response.data?.message || "Invalid request.");
      } else if (err.response?.status === 401) {
        setErrMsg(err.response.data?.message || "Invalid credentials.");
      } else if (err.response?.status === 429) {
        setErrMsg("Too many login attempts. Please try again later.");
      } else {
        setErrMsg("Login Failed. Please try again later.");
      }
      errRef.current?.focus();
    } finally {
      setLoading(false);
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
                  disabled={showTwoFactor}
                  className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 disabled:opacity-50"
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
                  disabled={showTwoFactor}
                  className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 disabled:opacity-50"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {showTwoFactor && (
                <div>
                  <label
                    htmlFor="twoFactorToken"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Two-Factor Authentication Code
                  </label>
                  <input
                    type="text"
                    id="twoFactorToken"
                    required
                    maxLength="6"
                    className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 text-center text-2xl tracking-widest"
                    value={twoFactorToken}
                    onChange={(e) =>
                      setTwoFactorToken(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}
              {!showTwoFactor && (
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
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 rounded-lg font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : showTwoFactor ? (
                  "Verify Code"
                ) : (
                  "Sign In"
                )}
              </button>
              {showTwoFactor && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTwoFactor(false);
                    setTwoFactorToken("");
                    setErrMsg("");
                  }}
                  className="w-full text-sm text-gray-400 hover:text-gray-300 underline"
                >
                  Back to Login
                </button>
              )}
              {!showTwoFactor && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
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
