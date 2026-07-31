import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import UserProfile from '../components/UserProfile';
import CreateRoom from '../components/CreateRoom';
import SearchPanel from '../components/SearchPanel';

export default function Chat() {
    const { user, token, API_URL } = useAuth();
    const { socket, onlineUsers, connected, unreadCounts, setActiveRoom, clearUnread } = useSocket();
    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoomState] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [mobileSidebar, setMobileSidebar] = useState(false);

    // Fetch rooms
    useEffect(() => {
        fetchRooms();
    }, [token]);

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_URL}/rooms`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setRooms(data.rooms);
                if (!activeRoom && data.rooms.length > 0) {
                    handleSelectRoom(data.rooms[0]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        }
    };

    // Handle DM creation events
    useEffect(() => {
        if (!socket) return;

        const handleDmCreated = (room) => {
            setRooms((prev) => {
                const exists = prev.find((r) => r._id === room._id);
                if (exists) return prev;
                return [room, ...prev];
            });
            handleSelectRoom(room);
        };

        socket.on('dm-created', handleDmCreated);
        return () => socket.off('dm-created', handleDmCreated);
    }, [socket]);

    // Join socket room when active room changes
    useEffect(() => {
        if (socket && activeRoom) {
            socket.emit('join-room', activeRoom._id);
            socket.emit('mark-read', { roomId: activeRoom._id });

            return () => {
                socket.emit('leave-room', activeRoom._id);
            };
        }
    }, [socket, activeRoom?._id]);

    const handleSelectRoom = (room) => {
        setActiveRoomState(room);
        setActiveRoom(room._id);
        clearUnread(room._id);
        setMobileSidebar(false);
    };

    const handleRoomCreated = (newRoom) => {
        setRooms((prev) => [newRoom, ...prev]);
        handleSelectRoom(newRoom);
        setShowCreateRoom(false);
    };

    const handleJoinRoom = async (roomId) => {
        try {
            const res = await fetch(`${API_URL}/rooms/${roomId}/join`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRooms((prev) => {
                    const exists = prev.find((r) => r._id === data.room._id);
                    if (exists) return prev;
                    return [data.room, ...prev];
                });
                handleSelectRoom(data.room);
            }
        } catch (err) {
            console.error('Failed to join room:', err);
        }
    };

    const handleStartDM = (targetUserId) => {
        if (socket) {
            socket.emit('create-dm', { targetUserId });
        }
    };

    return (
        <div className="chat-app">
            <Sidebar
                rooms={rooms}
                activeRoom={activeRoom}
                onSelectRoom={handleSelectRoom}
                onlineUsers={onlineUsers}
                user={user}
                connected={connected}
                onShowProfile={() => setShowProfile(true)}
                onShowCreateRoom={() => setShowCreateRoom(true)}
                onShowSearch={() => setShowSearch(true)}
                mobileOpen={mobileSidebar}
                onCloseMobile={() => setMobileSidebar(false)}
                unreadCounts={unreadCounts}
                onStartDM={handleStartDM}
            />

            <ChatArea
                room={activeRoom}
                user={user}
                token={token}
                socket={socket}
                onlineUsers={onlineUsers}
                onOpenSidebar={() => setMobileSidebar(true)}
                API_URL={API_URL}
            />

            {showProfile && (
                <UserProfile
                    onClose={() => setShowProfile(false)}
                    socket={socket}
                />
            )}

            {showCreateRoom && (
                <CreateRoom
                    onClose={() => setShowCreateRoom(false)}
                    onCreated={handleRoomCreated}
                />
            )}

            {showSearch && (
                <SearchPanel
                    onClose={() => setShowSearch(false)}
                    token={token}
                    API_URL={API_URL}
                />
            )}
        </div>
    );
}
