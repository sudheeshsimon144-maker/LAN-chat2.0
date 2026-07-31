import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Edit3, Save, LogOut, Circle } from 'lucide-react';

const avatarColors = [
    '#dc2626', '#ea580c', '#d97706', '#65a30d', '#16a34a',
    '#0d9488', '#0284c7', '#7c3aed', '#c026d3', '#e11d48',
];

function getColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

const statusOptions = [
    { value: 'online', label: 'Online', color: '#22c55e', icon: '🟢' },
    { value: 'away', label: 'Away', color: '#f59e0b', icon: '🟡' },
    { value: 'busy', label: 'Do Not Disturb', color: '#ef4444', icon: '🔴' },
];

export default function UserProfile({ onClose, socket }) {
    const { user, updateProfile, logout } = useAuth();
    const [editing, setEditing] = useState(false);
    const [bio, setBio] = useState(user?.bio || '');
    const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
    const [currentStatus, setCurrentStatus] = useState(user?.status || 'online');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await updateProfile({ bio, statusMessage });
        // Update status via socket
        if (socket) {
            socket.emit('update-status', { status: currentStatus, statusMessage });
        }
        setSaving(false);
        setEditing(false);
    };

    const handleStatusChange = (status) => {
        setCurrentStatus(status);
        if (socket && !editing) {
            socket.emit('update-status', { status });
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}><X size={20} /></button>

                <div className="profile-header-section">
                    <div
                        className="profile-avatar-large"
                        style={{ background: user ? getColor(user.username) : '#666' }}
                    >
                        {user?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <h2>{user?.username}</h2>
                    <p className="profile-email">{user?.email}</p>
                    <div className="profile-joined">
                        Joined {new Date(user?.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                        })}
                    </div>
                </div>

                {/* Status Selector */}
                <div className="status-selector">
                    <label>Status</label>
                    <div className="status-options">
                        {statusOptions.map((opt) => (
                            <button
                                key={opt.value}
                                className={`status-option ${currentStatus === opt.value ? 'active' : ''}`}
                                onClick={() => handleStatusChange(opt.value)}
                            >
                                <span className="status-dot-large" style={{ background: opt.color }}></span>
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="profile-fields">
                    <div className="profile-field">
                        <label>Status Message</label>
                        {editing ? (
                            <input
                                type="text"
                                value={statusMessage}
                                onChange={(e) => setStatusMessage(e.target.value)}
                                placeholder="What's on your mind?"
                                maxLength={100}
                            />
                        ) : (
                            <p>{user?.statusMessage || 'No status set'}</p>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>Bio</label>
                        {editing ? (
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell us about yourself..."
                                maxLength={160}
                                rows={3}
                            />
                        ) : (
                            <p>{user?.bio || 'No bio yet'}</p>
                        )}
                    </div>
                </div>

                <div className="profile-actions">
                    {editing ? (
                        <>
                            <button className="profile-btn save" onClick={handleSave} disabled={saving}>
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button className="profile-btn cancel" onClick={() => setEditing(false)}>
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button className="profile-btn edit" onClick={() => setEditing(true)}>
                            <Edit3 size={16} />
                            Edit Profile
                        </button>
                    )}
                    <button className="profile-btn logout" onClick={logout}>
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
