import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    MessageCircle, Search, Plus, LogOut, Settings,
    Hash, Lock, Wifi, WifiOff, X, Users, Mail,
    Bell, BellOff, Circle
} from 'lucide-react';

const avatarColors = [
    '#dc2626', '#ea580c', '#d97706', '#65a30d', '#16a34a',
    '#0d9488', '#0284c7', '#7c3aed', '#c026d3', '#e11d48',
];

function getColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

const statusColors = {
    online: '#22c55e',
    away: '#f59e0b',
    busy: '#ef4444',
    offline: '#5b6178',
};

export default function Sidebar({
    rooms, activeRoom, onSelectRoom, onlineUsers, user,
    connected, onShowProfile, onShowCreateRoom, onShowSearch,
    mobileOpen, onCloseMobile, unreadCounts = {}, onStartDM
}) {
    const { logout } = useAuth();
    const { notificationsEnabled, toggleNotifications } = useSocket();
    const [showDMUserList, setShowDMUserList] = useState(false);

    const isOnline = (username) => onlineUsers.some((u) => u.username === username);

    // Separate rooms into channels and DMs
    const channels = rooms.filter((r) => r.type !== 'dm');
    const dms = rooms.filter((r) => r.type === 'dm');

    // Get the other person's name in a DM
    const getDMName = (room) => {
        if (room.type !== 'dm') return room.name;
        const other = room.members?.find((m) =>
            (typeof m === 'object' ? m.username : m) !== user?.username
        );
        if (typeof other === 'object') return other?.username || room.name;
        return room.name;
    };

    const getUserStatus = (username) => {
        const u = onlineUsers.find((o) => o.username === username);
        return u?.status || 'offline';
    };

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile}></div>}

            <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
                {/* Header */}
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <MessageCircle size={24} className="brand-icon" />
                        <span>LAN Chat</span>
                    </div>
                    <div className="header-btns">
                        <button className="icon-btn" onClick={toggleNotifications} title={notificationsEnabled ? 'Mute notifications' : 'Enable notifications'}>
                            {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                        </button>
                        <button className="icon-btn mobile-close" onClick={onCloseMobile}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Connection status */}
                <div className={`connection-status ${connected ? 'online' : 'offline'}`}>
                    {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                    <span>{connected ? 'Connected' : 'Reconnecting...'}</span>
                </div>

                {/* Action buttons */}
                <div className="sidebar-actions">
                    <button className="sidebar-action-btn" onClick={onShowSearch}>
                        <Search size={16} />
                        <span>Search</span>
                    </button>
                    <button className="sidebar-action-btn" onClick={onShowCreateRoom}>
                        <Plus size={16} />
                        <span>New Room</span>
                    </button>
                </div>

                {/* Channels */}
                <div className="sidebar-section">
                    <h3 className="section-title">
                        <Hash size={14} />
                        Channels
                        <span className="section-count">{channels.length}</span>
                    </h3>
                    <div className="room-list">
                        {channels.map((room) => {
                            const unread = unreadCounts[room._id] || 0;
                            return (
                                <button
                                    key={room._id}
                                    className={`room-item ${activeRoom?._id === room._id ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                                    onClick={() => onSelectRoom(room)}
                                >
                                    <span className="room-icon">{room.icon || '💬'}</span>
                                    <div className="room-info">
                                        <span className="room-name">{room.name}</span>
                                        {room.lastMessage && (
                                            <span className="room-preview">
                                                {room.lastMessage.sender}: {room.lastMessage.content}
                                            </span>
                                        )}
                                    </div>
                                    {unread > 0 && (
                                        <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>
                                    )}
                                    {room.type === 'private' && <Lock size={12} className="room-lock" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Direct Messages */}
                <div className="sidebar-section dm-section">
                    <h3 className="section-title">
                        <Mail size={14} />
                        Direct Messages
                        <span className="section-count">{dms.length}</span>
                        <button className="dm-add-btn" onClick={() => setShowDMUserList(!showDMUserList)} title="New DM">
                            <Plus size={14} />
                        </button>
                    </h3>

                    {/* DM user picker */}
                    {showDMUserList && (
                        <div className="dm-user-picker">
                            {onlineUsers
                                .filter((u) => u.username !== user?.username)
                                .map((u) => (
                                    <button
                                        key={u.userId}
                                        className="dm-user-option"
                                        onClick={() => {
                                            onStartDM(u.userId);
                                            setShowDMUserList(false);
                                        }}
                                    >
                                        <div className="user-avatar-small" style={{ background: getColor(u.username) }}>
                                            {u.username[0].toUpperCase()}
                                        </div>
                                        <span>{u.username}</span>
                                        <div className="status-dot" style={{ background: statusColors[u.status || 'online'] }}></div>
                                    </button>
                                ))}
                            {onlineUsers.filter((u) => u.username !== user?.username).length === 0 && (
                                <div className="dm-empty">No other users online</div>
                            )}
                        </div>
                    )}

                    <div className="room-list">
                        {dms.map((room) => {
                            const dmName = getDMName(room);
                            const unread = unreadCounts[room._id] || 0;
                            const dmStatus = getUserStatus(dmName);
                            return (
                                <button
                                    key={room._id}
                                    className={`room-item dm-item ${activeRoom?._id === room._id ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                                    onClick={() => onSelectRoom(room)}
                                >
                                    <div className="dm-avatar-container">
                                        <div className="user-avatar-small" style={{ background: getColor(dmName) }}>
                                            {dmName[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="dm-status-dot" style={{ background: statusColors[dmStatus] }}></div>
                                    </div>
                                    <div className="room-info">
                                        <span className="room-name">{dmName}</span>
                                        {room.lastMessage && (
                                            <span className="room-preview">
                                                {room.lastMessage.content}
                                            </span>
                                        )}
                                    </div>
                                    {unread > 0 && (
                                        <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Online Users */}
                <div className="sidebar-section">
                    <h3 className="section-title">
                        <Users size={14} />
                        Online
                        <span className="section-count">{onlineUsers.length}</span>
                    </h3>
                    <div className="online-list">
                        {onlineUsers.map((u) => (
                            <div
                                key={u.userId}
                                className="online-user-item"
                                onClick={() => u.username !== user?.username && onStartDM(u.userId)}
                                style={{ cursor: u.username !== user?.username ? 'pointer' : 'default' }}
                                title={u.username !== user?.username ? `Message ${u.username}` : ''}
                            >
                                <div className="dm-avatar-container">
                                    <div
                                        className="user-avatar-small"
                                        style={{ background: getColor(u.username) }}
                                    >
                                        {u.username[0].toUpperCase()}
                                    </div>
                                    <div className="dm-status-dot" style={{ background: statusColors[u.status || 'online'] }}></div>
                                </div>
                                <div className="online-user-info">
                                    <span className="online-username">
                                        {u.username}
                                        {u.username === user?.username ? ' (you)' : ''}
                                    </span>
                                    {u.statusMessage && (
                                        <span className="online-status-msg">{u.statusMessage}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* User footer */}
                <div className="sidebar-footer">
                    <div className="user-info" onClick={onShowProfile}>
                        <div className="dm-avatar-container">
                            <div
                                className="user-avatar-small"
                                style={{ background: user ? getColor(user.username) : '#666' }}
                            >
                                {user?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="dm-status-dot" style={{ background: statusColors[getUserStatus(user?.username)] }}></div>
                        </div>
                        <div className="user-details">
                            <span className="username">{user?.username}</span>
                            <span className="user-status-text">{user?.statusMessage || 'Online'}</span>
                        </div>
                    </div>
                    <div className="footer-actions">
                        <button className="icon-btn" onClick={onShowProfile} title="Settings">
                            <Settings size={18} />
                        </button>
                        <button className="icon-btn logout-btn" onClick={logout} title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
