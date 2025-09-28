import {createContext, useState, useEffect} from "react";
import axios from "../api/axios";

const AuthContext = createContext({});

export const AuthProvider = ({children}) => {
    const [auth, setAuth] = useState({});

    // Initialize auth from localStorage on app start
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            // Set axios default header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Validate token with server
            const validateToken = async () => {
                try {
                    const response = await axios.get('/auth/validate');
                    if (response.data.success) {
                        setAuth({
                            user: response.data.user.username,
                            role: response.data.user.role,
                            token,
                            userId: response.data.user.id,
                            email: response.data.user.email,
                            is2FAEnabled: response.data.user.is_2fa_enabled
                        });
                    } else {
                        // Invalid token, clear it
                        localStorage.removeItem('authToken');
                        delete axios.defaults.headers.common['Authorization'];
                    }
                } catch (error) {
                    // Invalid token, clear it
                    localStorage.removeItem('authToken');
                    delete axios.defaults.headers.common['Authorization'];
                    console.error('Token validation failed:', error);
                }
            };
            
            validateToken();
        }
    }, []);

    return (
        <AuthContext.Provider value={{auth, setAuth}}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;