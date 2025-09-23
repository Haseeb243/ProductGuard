import { Outlet } from "react-router-dom"

const Layout = () => {
    return (
        <main className="min-h-screen bg-gray-50 w-full">
            <div className="w-full px-0 py-0">
                <Outlet />
            </div>
        </main>
    );
}

export default Layout;
