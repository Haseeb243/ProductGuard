import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import QrScanner from "../QrScanner";
import { useConfig } from "../../context/ConfigContext";

const ConsumerVerification = () => {
  const { apiBaseUrl } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const qrData = location.state?.qrData;

  const [verificationState, setVerificationState] = useState("scanner"); // scanner, verifying, result
  const [scanData, setScanData] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [ownershipType, setOwnershipType] = useState(""); // receive or sell
  const [ownershipData, setOwnershipData] = useState({
    ownerName: "",
    currentOwner: "",
    newOwner: ""
  });

  useEffect(() => {
    if (qrData) {
      setScanData(qrData);
      handleVerification(qrData);
    }
  }, [qrData]);

  useEffect(() => {
    // Request location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationEnabled(true);
        },
        (error) => {
          console.log("Location access denied or unavailable:", error);
          setLocationEnabled(false);
        }
      );
    }
  }, []);

  const handleScan = (data) => {
    setScanData(data);
    handleVerification(data);
  };

  const handleVerification = async (qrPayload) => {
    if (!qrPayload) return;
    
    setLoading(true);
    setError("");
    setVerificationState("verifying");

    try {
      const qrParts = qrPayload.split(",");
      const serialNumber = qrParts[1];

      if (!serialNumber) {
        throw new Error("Invalid QR code format");
      }

      const requestData = {
        serialNumber,
        qrPayload,
        userAgent: navigator.userAgent
      };

      if (userLocation) {
        requestData.deviceLocation = userLocation;
      }

      const response = await axios.post(`${apiBaseUrl}/verification/scan`, requestData);
      
      if (response.data.success) {
        setVerificationResult(response.data);
        setVerificationState("result");
      } else {
        setError(response.data.message || "Verification failed");
        setVerificationState("scanner");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(err.response?.data?.message || err.message || "Verification failed");
      setVerificationState("scanner");
    } finally {
      setLoading(false);
    }
  };

  const handleOwnership = async (type) => {
    setOwnershipType(type);
    setShowOwnershipModal(true);
  };

  const submitOwnership = async () => {
    if (!verificationResult?.product?.serialnumber) return;

    try {
      let endpoint, data;
      
      if (ownershipType === "receive") {
        endpoint = "/verification/ownership/receive";
        data = {
          serialNumber: verificationResult.product.serialnumber,
          ownerName: ownershipData.ownerName
        };
      } else {
        endpoint = "/verification/ownership/sell";
        data = {
          serialNumber: verificationResult.product.serialnumber,
          currentOwner: ownershipData.currentOwner,
          newOwner: ownershipData.newOwner
        };
      }

      const response = await axios.post(`${apiBaseUrl}${endpoint}`, data);
      
      if (response.data.success) {
        alert("Ownership recorded successfully!");
        setShowOwnershipModal(false);
        setOwnershipData({ ownerName: "", currentOwner: "", newOwner: "" });
      } else {
        alert(response.data.message || "Failed to record ownership");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to record ownership");
    }
  };

  const manualEntry = () => {
    const serial = prompt("Enter product serial number:");
    if (serial) {
      const mockQr = `CONTRACT_ADDRESS,${serial}`;
      handleVerification(mockQr);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2s"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4s"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Product Verification
          </h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            Scan or enter a product QR code to verify authenticity and track ownership
          </p>
        </div>

        {/* Location status */}
        {!locationEnabled && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-yellow-500/20 backdrop-blur-sm rounded-xl border border-yellow-500/30">
            <p className="text-yellow-200 text-sm text-center">
              Enable location for better verification accuracy
            </p>
          </div>
        )}

        {/* Main content */}
        <div className="max-w-lg mx-auto">
          {verificationState === "scanner" && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Scan QR Code
                </h2>
                <p className="text-gray-300">
                  Point your camera at the product QR code
                </p>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-500/20 backdrop-blur-sm rounded-xl border border-red-500/30">
                  <p className="text-red-200 text-center">{error}</p>
                </div>
              )}

              <div className="mb-6">
                <QrScanner onScan={handleScan} />
              </div>

              <button
                onClick={manualEntry}
                className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl border border-white/30 text-white font-medium transition-all duration-200 hover:scale-105"
              >
                Enter Serial Number Manually
              </button>
            </div>
          )}

          {verificationState === "verifying" && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Verifying Product...
                </h2>
                <p className="text-gray-300">
                  Please wait while we check the product authenticity
                </p>
              </div>
            </div>
          )}

          {verificationState === "result" && verificationResult && (
            <div className="space-y-6">
              {/* Verification Status */}
              <div className={`bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl ${
                verificationResult.isAuthentic ? 'border-green-500/50' : 'border-red-500/50'
              }`}>
                <div className="text-center mb-6">
                  {verificationResult.isAuthentic ? (
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  
                  <h2 className={`text-3xl font-bold mb-2 ${
                    verificationResult.isAuthentic ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {verificationResult.isAuthentic ? 'Authentic Product' : 'Counterfeit Product'}
                  </h2>
                  
                  {verificationResult.isSuspicious && (
                    <div className="inline-flex items-center px-3 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/30">
                      <svg className="w-4 h-4 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-yellow-200 text-sm font-medium">Suspicious Activity</span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                {verificationResult.product && (
                  <div className="bg-white/5 rounded-2xl p-6 mb-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Product Details</h3>
                    <div className="space-y-3 text-gray-300">
                      <div className="flex justify-between">
                        <span>Name:</span>
                        <span className="text-white font-medium">{verificationResult.product.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Brand:</span>
                        <span className="text-white font-medium">{verificationResult.product.brand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Serial:</span>
                        <span className="text-white font-medium">{verificationResult.product.serialnumber}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suspicion Details */}
                {verificationResult.isSuspicious && verificationResult.suspicionReason && (
                  <div className="bg-yellow-500/10 rounded-2xl p-6 mb-6 border border-yellow-500/20">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2">Security Alert</h3>
                    <p className="text-yellow-200 text-sm">
                      {verificationResult.suspicionReason === 'rapid_scans_multiple_ips' 
                        ? 'This product has been scanned multiple times recently from different locations, which may indicate suspicious activity.'
                        : verificationResult.suspicionReason}
                    </p>
                  </div>
                )}

                {/* Ownership Actions */}
                {verificationResult.isAuthentic && !verificationResult.isSuspicious && (
                  <div className="space-y-3">
                    <button
                      onClick={() => handleOwnership("receive")}
                      className="w-full py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-sm rounded-xl border border-blue-500/30 text-blue-200 font-medium transition-all duration-200 hover:scale-105"
                    >
                      Mark as Received
                    </button>
                    <button
                      onClick={() => handleOwnership("sell")}
                      className="w-full py-3 px-4 bg-purple-500/20 hover:bg-purple-500/30 backdrop-blur-sm rounded-xl border border-purple-500/30 text-purple-200 font-medium transition-all duration-200 hover:scale-105"
                    >
                      Transfer Ownership
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setVerificationState("scanner");
                    setVerificationResult(null);
                    setError("");
                  }}
                  className="w-full mt-4 py-3 px-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl border border-white/30 text-white font-medium transition-all duration-200 hover:scale-105"
                >
                  Scan Another Product
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back button */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 text-white font-medium transition-all duration-200 hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>

      {/* Ownership Modal */}
      {showOwnershipModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full">
            <h3 className="text-2xl font-semibold text-white mb-6 text-center">
              {ownershipType === "receive" ? "Mark as Received" : "Transfer Ownership"}
            </h3>
            
            <div className="space-y-4">
              {ownershipType === "receive" ? (
                <input
                  type="text"
                  placeholder="Your name"
                  value={ownershipData.ownerName}
                  onChange={(e) => setOwnershipData({...ownershipData, ownerName: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Current owner name"
                    value={ownershipData.currentOwner}
                    onChange={(e) => setOwnershipData({...ownershipData, currentOwner: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="New owner name"
                    value={ownershipData.newOwner}
                    onChange={(e) => setOwnershipData({...ownershipData, newOwner: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowOwnershipModal(false)}
                className="flex-1 py-3 px-4 bg-gray-500/20 hover:bg-gray-500/30 backdrop-blur-sm rounded-xl border border-gray-500/30 text-gray-200 font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={submitOwnership}
                className="flex-1 py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-sm rounded-xl border border-blue-500/30 text-blue-200 font-medium transition-all duration-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumerVerification;