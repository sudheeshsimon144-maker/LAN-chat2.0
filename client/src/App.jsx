import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    return !user ? children : <Navigate to="/" />;
}

function LoadingScreen() {
    return (
        <div className="loading-screen">
            <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <span className="loading-text">LAN Chat</span>
            </div>
        </div>
    );
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/*" element={
                <PrivateRoute>
                    <SocketProvider>
                        <Chat />
                    </SocketProvider>
                </PrivateRoute>
            } />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
