import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Notification sound using Web Audio API
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(830, ctx.currentTime);
        osc.frequency.setValueAtTime(990, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch {
        // Silently fail if audio context not available
    }
}

export function SocketProvider({ children }) {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [connected, setConnected] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const socketRef = useRef(null);
    const activeRoomRef = useRef(null);

    useEffect(() => {
        if (token && user) {
            const newSocket = io(window.location.origin, {
                auth: { token },
                transports: ['websocket', 'polling'],
            });

            newSocket.on('connect', () => {
                setConnected(true);
                console.log('Socket connected');
            });

            newSocket.on('disconnect', () => {
                setConnected(false);
                console.log('Socket disconnected');
            });

            newSocket.on('online-users', (users) => {
                setOnlineUsers(users);
            });

            // Track incoming messages for unread badges + notification
            newSocket.on('chat-message', (msg) => {
                if (msg.senderUsername !== user.username) {
                    const currentRoom = activeRoomRef.current;
                    if (msg.room !== currentRoom) {
                        // Message in a non-active room → increment unread
                        setUnreadCounts((prev) => ({
                            ...prev,
                            [msg.room]: (prev[msg.room] || 0) + 1,
                        }));
                    }
                    // Play sound for all incoming messages from others
                    if (notificationsEnabled) {
                        playNotificationSound();
                    }
                }
            });

            newSocket.on('file-message', (msg) => {
                if (msg.senderUsername !== user.username) {
                    const currentRoom = activeRoomRef.current;
                    if (msg.room !== currentRoom) {
                        setUnreadCounts((prev) => ({
                            ...prev,
                            [msg.room]: (prev[msg.room] || 0) + 1,
                        }));
                    }
                    if (notificationsEnabled) {
                        playNotificationSound();
                    }
                }
            });

            socketRef.current = newSocket;
            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
                socketRef.current = null;
            };
        }
    }, [token, user]);

    const setActiveRoom = useCallback((roomId) => {
        activeRoomRef.current = roomId;
        // Clear unread for this room
        if (roomId) {
            setUnreadCounts((prev) => {
                const next = { ...prev };
                delete next[roomId];
                return next;
            });
        }
    }, []);

    const clearUnread = useCallback((roomId) => {
        setUnreadCounts((prev) => {
            const next = { ...prev };
            delete next[roomId];
            return next;
        });
    }, []);

    const toggleNotifications = useCallback(() => {
        setNotificationsEnabled((prev) => !prev);
    }, []);

    return (
        <SocketContext.Provider value={{
            socket, onlineUsers, connected,
            unreadCounts, setActiveRoom, clearUnread,
            notificationsEnabled, toggleNotifications,
        }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
