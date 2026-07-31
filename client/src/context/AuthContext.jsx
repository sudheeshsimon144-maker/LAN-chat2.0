import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = '/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('chat-token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                logout();
            }
        } catch {
            logout();
        } finally {
            setLoading(false);
        }
    };

    const register = async (username, email, password) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('chat-token', data.token);
        return data;
    };

    const login = async (email, password) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('chat-token', data.token);
        return data;
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('chat-token');
    };

    const updateProfile = async (updates) => {
        const res = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (res.ok) setUser(data.user);
        return data;
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, API_URL }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
