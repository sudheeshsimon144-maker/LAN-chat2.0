import { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import EmojiPicker from './EmojiPicker';
import {
    Send, Paperclip, Smile, Menu, Users, Hash,
    ArrowDown, X, Reply, Pin
} from 'lucide-react';

export default function ChatArea({ room, user, token, socket, onlineUsers, onOpenSidebar, API_URL }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [lightboxImg, setLightboxImg] = useState(null);
    const [showPinned, setShowPinned] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const messagesRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Fetch messages when room changes
    useEffect(() => {
        if (room && token) {
            fetchMessages();
            setMessages([]);
            setReplyTo(null);
            setShowPinned(false);
        }
    }, [room?._id]);

    // Socket listeners
    useEffect(() => {
        if (!socket || !room) return;

        const handleMessage = (msg) => {
            if (msg.room === room._id) {
                setMessages((prev) => [...prev, msg]);
                scrollToBottom();
            }
        };

        const handleFileMessage = (msg) => {
            if (msg.room === room._id) {
                setMessages((prev) => [...prev, msg]);
                scrollToBottom();
            }
        };

        const handleTyping = (data) => {
            if (data.roomId === room._id && data.username !== user.username) {
                setTyping(`${data.username} is typing...`);
            }
        };

        const handleStopTyping = (data) => {
            if (data.roomId === room._id) {
                setTyping('');
            }
        };

        const handleReaction = (data) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg
                )
            );
        };

        const handleEdited = (data) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === data.messageId
                        ? { ...msg, content: data.content, edited: true }
                        : msg
                )
            );
        };

        const handleDeleted = (data) => {
            setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
        };

        const handlePinned = (data) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === data.messageId
                        ? { ...msg, pinned: true, pinnedBy: data.pinnedBy }
                        : msg
                )
            );
        };

        const handleUnpinned = (data) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === data.messageId
                        ? { ...msg, pinned: false, pinnedBy: null }
                        : msg
                )
            );
            setPinnedMessages((prev) => prev.filter((m) => m._id !== data.messageId));
        };

        socket.on('chat-message', handleMessage);
        socket.on('file-message', handleFileMessage);
        socket.on('typing', handleTyping);
        socket.on('stop-typing', handleStopTyping);
        socket.on('reaction-updated', handleReaction);
        socket.on('message-edited', handleEdited);
        socket.on('message-deleted', handleDeleted);
        socket.on('message-pinned', handlePinned);
        socket.on('message-unpinned', handleUnpinned);

        return () => {
            socket.off('chat-message', handleMessage);
            socket.off('file-message', handleFileMessage);
            socket.off('typing', handleTyping);
            socket.off('stop-typing', handleStopTyping);
            socket.off('reaction-updated', handleReaction);
            socket.off('message-edited', handleEdited);
            socket.off('message-deleted', handleDeleted);
            socket.off('message-pinned', handlePinned);
            socket.off('message-unpinned', handleUnpinned);
        };
    }, [socket, room?._id, user?.username]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`${API_URL}/messages/room/${room._id}?limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
                setTimeout(scrollToBottom, 100);
            }
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        }
    };

    const fetchPinnedMessages = async () => {
        try {
            const res = await fetch(`${API_URL}/messages/room/${room._id}/pinned`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPinnedMessages(data.messages);
            }
        } catch (err) {
            console.error('Failed to fetch pinned:', err);
        }
    };

    const scrollToBottom = () => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    };

    const handleScroll = () => {
        if (messagesRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
            setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
        }
    };

    const sendMessage = (e) => {
        e?.preventDefault();
        const msg = input.trim();
        if (!msg || !socket || !room) return;

        socket.emit('chat-message', {
            roomId: room._id,
            content: msg,
            replyTo: replyTo?._id || null,
        });
        socket.emit('stop-typing', room._id);
        setInput('');
        setReplyTo(null);
        setShowEmoji(false);
        inputRef.current?.focus();
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (socket && room) {
            socket.emit('typing', room._id);
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stop-typing', room._id);
            }, 1500);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 100 * 1024 * 1024) {
            alert('File too large (max 100MB)');
            return;
        }
        setSelectedFile(file);
    };

    const sendFile = async () => {
        if (!selectedFile || !socket || !room) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            socket.emit('file-message', {
                roomId: room._id,
                file: {
                    url: data.url,
                    originalname: data.originalname,
                    size: data.size,
                    mimetype: data.mimetype,
                },
            });
        } catch (err) {
            alert('Upload failed');
            console.error(err);
        } finally {
            setUploading(false);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleReaction = (messageId, emoji) => {
        if (socket) {
            socket.emit('add-reaction', { messageId, emoji });
        }
    };

    const handleDeleteMessage = (messageId) => {
        if (socket) {
            socket.emit('delete-message', { messageId });
        }
    };

    const handlePinMessage = (messageId) => {
        if (socket) {
            socket.emit('pin-message', { messageId });
        }
    };

    const handleUnpinMessage = (messageId) => {
        if (socket) {
            socket.emit('unpin-message', { messageId });
        }
    };

    const addEmoji = (emoji) => {
        setInput((prev) => prev + emoji);
        inputRef.current?.focus();
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const pinnedCount = messages.filter((m) => m.pinned).length;

    if (!room) {
        return (
            <main className="chat-area empty-state">
                <div className="empty-chat">
                    <div className="empty-icon">💬</div>
                    <h2>Select a channel</h2>
                    <p>Choose a channel from the sidebar to start chatting</p>
                </div>
            </main>
        );
    }

    return (
        <main className="chat-area">
            {/* Header */}
            <header className="chat-header">
                <div className="header-left">
                    <button className="icon-btn mobile-menu" onClick={onOpenSidebar}>
                        <Menu size={20} />
                    </button>
                    <Hash size={20} className="header-hash" />
                    <div className="header-info">
                        <h2>{room.name}</h2>
                        {room.description && <p>{room.description}</p>}
                    </div>
                </div>
                <div className="header-right">
                    {pinnedCount > 0 && (
                        <button
                            className={`header-action-btn ${showPinned ? 'active' : ''}`}
                            onClick={() => {
                                setShowPinned(!showPinned);
                                if (!showPinned) fetchPinnedMessages();
                            }}
                            title="Pinned messages"
                        >
                            <Pin size={16} />
                            <span className="pin-count">{pinnedCount}</span>
                        </button>
                    )}
                    <div className="member-count">
                        <Users size={16} />
                        <span>{room.members?.length || 0}</span>
                    </div>
                </div>
            </header>

            {/* Pinned messages panel */}
            {showPinned && (
                <div className="pinned-panel">
                    <div className="pinned-header">
                        <Pin size={16} />
                        <span>Pinned Messages</span>
                        <button className="icon-btn" onClick={() => setShowPinned(false)}>
                            <X size={16} />
                        </button>
                    </div>
                    <div className="pinned-list">
                        {pinnedMessages.length === 0 ? (
                            <div className="pinned-empty">No pinned messages yet</div>
                        ) : (
                            pinnedMessages.map((msg) => (
                                <div key={msg._id} className="pinned-item">
                                    <div className="pinned-item-header">
                                        <span className="pinned-author">{msg.senderUsername}</span>
                                        <span className="pinned-time">
                                            {new Date(msg.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="pinned-content">{msg.content}</p>
                                    <button
                                        className="unpin-btn"
                                        onClick={() => handleUnpinMessage(msg._id)}
                                    >
                                        Unpin
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="messages-container" ref={messagesRef} onScroll={handleScroll}>
                <div className="messages-start">
                    <div className="channel-welcome">
                        <span className="welcome-icon">{room.icon || '💬'}</span>
                        <h3>Welcome to #{room.name}</h3>
                        <p>{room.description || 'This is the start of the conversation.'}</p>
                    </div>
                </div>

                {messages.map((msg, i) => (
                    <MessageBubble
                        key={msg._id || i}
                        message={msg}
                        isOwn={msg.sender === user._id || msg.senderUsername === user.username}
                        user={user}
                        onReply={() => setReplyTo(msg)}
                        onReact={(emoji) => handleReaction(msg._id, emoji)}
                        onDelete={() => handleDeleteMessage(msg._id)}
                        onPin={() => handlePinMessage(msg._id)}
                        onUnpin={() => handleUnpinMessage(msg._id)}
                        onImageClick={(url) => setLightboxImg(url)}
                    />
                ))}

                {typing && (
                    <div className="typing-indicator">
                        <div className="typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                        {typing}
                    </div>
                )}
            </div>

            {/* Scroll to bottom */}
            {showScrollBtn && (
                <button className="scroll-bottom-btn" onClick={scrollToBottom}>
                    <ArrowDown size={18} />
                </button>
            )}

            {/* Reply bar */}
            {replyTo && (
                <div className="reply-bar">
                    <Reply size={16} />
                    <span>Replying to <strong>{replyTo.senderUsername}</strong>: {replyTo.content?.substring(0, 80)}</span>
                    <button className="icon-btn" onClick={() => setReplyTo(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* File preview */}
            {selectedFile && (
                <div className="file-preview-bar">
                    <div className="file-preview-info">
                        <Paperclip size={16} />
                        <span className="file-name">{selectedFile.name}</span>
                        <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                    </div>
                    <div className="file-preview-actions">
                        <button className="cancel-btn" onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}>
                            <X size={16} />
                        </button>
                        <button className="send-file-btn" onClick={sendFile} disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Send'}
                        </button>
                    </div>
                </div>
            )}

            {/* Input */}
            <form className="chat-input-bar" onSubmit={sendMessage}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden />
                <button type="button" className="icon-btn" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip size={20} />
                </button>
                <div className="input-wrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message #${room.name}`}
                        autoFocus
                    />
                </div>
                <button type="button" className="icon-btn" onClick={() => setShowEmoji(!showEmoji)}>
                    <Smile size={20} />
                </button>
                <button type="submit" className="send-btn" disabled={!input.trim() && !selectedFile}>
                    <Send size={20} />
                </button>
            </form>

            {/* Emoji Picker */}
            {showEmoji && (
                <EmojiPicker
                    onSelect={addEmoji}
                    onClose={() => setShowEmoji(false)}
                />
            )}

            {/* Lightbox */}
            {lightboxImg && (
                <div className="lightbox" onClick={() => setLightboxImg(null)}>
                    <button className="lightbox-close"><X size={24} /></button>
                    <img src={lightboxImg} alt="Preview" />
                </div>
            )}
        </main>
    );
}
