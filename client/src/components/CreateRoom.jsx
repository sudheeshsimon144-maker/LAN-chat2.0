import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Hash, Lock, Globe } from 'lucide-react';

const roomIcons = ['💬', '🎮', '🎵', '💻', '🎨', '📚', '🏆', '🌍', '🎲', '🔥', '⚡', '🚀', '💡', '🎯', '☕', '🍿'];

export default function CreateRoom({ onClose, onCreated }) {
    const { token, API_URL } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('public');
    const [icon, setIcon] = useState('💬');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/rooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: name.trim(), description, type, icon }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onCreated(data.room);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content create-room-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}><X size={20} /></button>

                <h2><Plus size={20} /> Create Channel</h2>
                <p className="modal-subtitle">Create a new channel to chat with your team</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Icon selector */}
                    <div className="icon-selector">
                        <label>Icon</label>
                        <div className="icon-grid">
                            {roomIcons.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    className={`icon-option ${icon === emoji ? 'selected' : ''}`}
                                    onClick={() => setIcon(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="input-group">
                        <Hash size={18} className="input-icon" />
                        <input
                            type="text"
                            placeholder="Channel name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            maxLength={50}
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={200}
                            style={{ paddingLeft: '16px' }}
                        />
                    </div>

                    {/* Type selector */}
                    <div className="type-selector">
                        <button
                            type="button"
                            className={`type-option ${type === 'public' ? 'selected' : ''}`}
                            onClick={() => setType('public')}
                        >
                            <Globe size={18} />
                            <div>
                                <strong>Public</strong>
                                <span>Anyone can join</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            className={`type-option ${type === 'private' ? 'selected' : ''}`}
                            onClick={() => setType('private')}
                        >
                            <Lock size={18} />
                            <div>
                                <strong>Private</strong>
                                <span>Invite only</span>
                            </div>
                        </button>
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading || !name.trim()}>
                        {loading ? <span className="btn-loader"></span> : 'Create Channel'}
                    </button>
                </form>
            </div>
        </div>
    );
}
