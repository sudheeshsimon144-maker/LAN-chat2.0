import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, ArrowRight, MessageCircle } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-screen">
            <div className="auth-bg-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>
            <div className="auth-card">
                <div className="auth-logo">
                    <MessageCircle size={40} />
                </div>
                <h1>Welcome back</h1>
                <p className="auth-subtitle">Sign in to continue to LAN Chat</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <Mail size={18} className="input-icon" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="input-group">
                        <Lock size={18} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? (
                            <span className="btn-loader"></span>
                        ) : (
                            <>
                                Sign In <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Sign up</Link>
                </p>
            </div>
        </div>
    );
}
