import Home from "./components/home/Home";
import Login from "./components/home/Login";
import ScannerPage from "./components/pages/ScannerPage";
import Admin from "./components/pages/Admin";
import AuditLogs from "./components/pages/AuditLogs";
import Manufacturer from "./components/pages/Manufacturer";
import Supplier from "./components/pages/Supplier";
import Retailer from "./components/pages/Retailer";
import { Routes, Route } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import Layout from "./components/Layout";
import AddAccount from "./components/pages/AddAccount";
import ManageAccount from "./components/pages/ManageAccount";
import AddProduct from "./components/pages/AddProduct";
import Profile from "./components/pages/Profile";
import TwoFactorAuth from "./components/pages/TwoFactorAuth";
import ForgotPassword from "./components/pages/ForgotPassword";
import ResetPassword from "./components/pages/ResetPassword";
import UpdateProduct from "./components/pages/UpdateProduct";
import Product from "./components/pages/Product";
import AuthenticProduct from "./components/pages/AuthenticProduct";
import FakeProduct from "./components/pages/FakeProduct";
import UpdateProductDetails from "./components/pages/UpdateProductDetails";
import SupportDashboard from "./components/SupportDashboard";
import TransparencyDashboard from "./components/pages/TransparencyDashboard";
import AnalyticsDashboard from "./components/pages/AnalyticsDashboard";
import ManufacturerChat from "./components/pages/ManufacturerChat";
import ManufacturerWallet from "./components/pages/ManufacturerWallet";
import SupplierChat from "./components/pages/SupplierChat";
import SupplierWallet from "./components/pages/SupplierWallet";
import SupplierScanner from "./components/pages/SupplierScanner";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* public routes */}
        <Route exact path="/" element={<Home />}></Route>
        <Route exact path="/login" element={<Login />}></Route>
        <Route exact path="/scanner" element={<ScannerPage />}></Route>
        <Route exact path="/product" element={<Product />}></Route>
        <Route
          exact
          path="/transparency"
          element={<TransparencyDashboard />}
        ></Route>
        <Route
          exact
          path="/authentic-product"
          element={<AuthenticProduct />}
        ></Route>
        <Route exact path="/fake-product" element={<FakeProduct />}></Route>

        {/* private routes */}
        <Route element={<RequireAuth allowedRoles={["admin"]} />}>
          <Route exact path="/admin" element={<Admin />}></Route>
          <Route exact path="/audit-logs" element={<AuditLogs />}></Route>
          <Route exact path="/add-account" element={<AddAccount />}></Route>
          <Route
            exact
            path="/manage-account"
            element={<ManageAccount />}
          ></Route>
          <Route
            exact
            path="/support-dashboard"
            element={<SupportDashboard />}
          ></Route>
          <Route
            exact
            path="/analytics"
            element={<AnalyticsDashboard />}
          ></Route>
        </Route>

        <Route
          element={
            <RequireAuth
              allowedRoles={["manufacturer", "supplier", "retailer"]}
            />
          }
        >
          <Route exact path="/profile" element={<Profile />}></Route>
          <Route
            exact
            path="/update-product"
            element={<UpdateProduct />}
          ></Route>
          <Route
            exact
            path="/update-product-details"
            element={<UpdateProductDetails />}
          ></Route>
        </Route>

        {/* 2FA settings accessible by all authenticated roles */}
        <Route
          element={
            <RequireAuth
              allowedRoles={["admin", "manufacturer", "supplier", "retailer"]}
            />
          }
        >
          <Route exact path="/2fa-settings" element={<TwoFactorAuth />}></Route>
        </Route>

        {/* Publicly reachable pages for password reset flow */}
        <Route
          exact
          path="/forgot-password"
          element={<ForgotPassword />}
        ></Route>
        <Route exact path="/reset-password" element={<ResetPassword />}></Route>

        <Route
          element={<RequireAuth allowedRoles={["supplier", "retailer"]} />}
        >
          <Route
            exact
            path="/update-product"
            element={<UpdateProduct />}
          ></Route>
          <Route
            exact
            path="/update-product-details"
            element={<UpdateProductDetails />}
          ></Route>
        </Route>

        <Route element={<RequireAuth allowedRoles={["manufacturer"]} />}>
          <Route exact path="/manufacturer" element={<Manufacturer />}></Route>
          <Route exact path="/add-product" element={<AddProduct />}></Route>
          <Route
            exact
            path="/manufacturer-chat"
            element={<ManufacturerChat />}
          ></Route>
          <Route
            exact
            path="/manufacturer-wallet"
            element={<ManufacturerWallet />}
          ></Route>
        </Route>

        <Route element={<RequireAuth allowedRoles={["supplier"]} />}>
          <Route exact path="/supplier" element={<Supplier />}></Route>
          <Route
            exact
            path="/supplier/scanner"
            element={<SupplierScanner />}
          ></Route>
          <Route
            exact
            path="/supplier/chat"
            element={<SupplierChat />}
          ></Route>
          <Route
            exact
            path="/supplier/wallet"
            element={<SupplierWallet />}
          ></Route>
        </Route>

        <Route element={<RequireAuth allowedRoles={["retailer"]} />}>
          <Route exact path="/retailer" element={<Retailer />}></Route>
        </Route>

        {/* catch all */}
        {/* <Route path='*' element={< Missing />}></Route> */}
      </Route>
    </Routes>
  );
}

export default App;
