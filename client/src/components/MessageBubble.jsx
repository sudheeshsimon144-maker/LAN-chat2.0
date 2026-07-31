import { useState } from 'react';
import {
    Reply, Smile, Trash2, Download, Pin, PinOff
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

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(mimetype, name) {
    if (mimetype?.startsWith('image/')) return '🖼️';
    if (mimetype?.startsWith('video/')) return '🎬';
    if (mimetype?.startsWith('audio/')) return '🎵';
    if (mimetype === 'application/pdf') return '📕';
    if (/zip|rar|7z|tar|gz/.test(name || '')) return '📦';
    if (/\.(js|ts|py|java|c|cpp|html|css|json)$/i.test(name || '')) return '💻';
    return '📄';
}

// Format message content with bold, italic, code
function formatContent(text) {
    if (!text) return '';
    // Code blocks
    let formatted = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Links
    formatted = formatted.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return formatted;
}

export default function MessageBubble({ message, isOwn, user, onReply, onReact, onDelete, onPin, onUnpin, onImageClick }) {
    const [showActions, setShowActions] = useState(false);
    const [showReactions, setShowReactions] = useState(false);

    if (message.type === 'system') {
        return (
            <div className="system-message">
                <span>{message.content}</span>
            </div>
        );
    }

    const isFile = message.type === 'file' || message.type === 'image';
    const file = message.file;

    // Group reactions
    const reactionGroups = {};
    (message.reactions || []).forEach((r) => {
        if (!reactionGroups[r.emoji]) {
            reactionGroups[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasOwn: false };
        }
        reactionGroups[r.emoji].count++;
        reactionGroups[r.emoji].users.push(r.username);
        if (r.username === user.username) reactionGroups[r.emoji].hasOwn = true;
    });

    return (
        <div
            className={`message-bubble-wrapper ${isOwn ? 'own' : 'other'} ${message.pinned ? 'pinned' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
        >
            {/* Pin indicator */}
            {message.pinned && (
                <div className="pin-indicator">
                    <Pin size={12} />
                    <span>Pinned</span>
                </div>
            )}

            {/* Avatar for others */}
            {!isOwn && (
                <div
                    className="msg-avatar"
                    style={{ background: getColor(message.senderUsername || '') }}
                >
                    {(message.senderUsername || '?')[0].toUpperCase()}
                </div>
            )}

            <div className="msg-content-area">
                {/* Username and time */}
                {!isOwn && (
                    <div className="msg-header">
                        <span className="msg-username" style={{ color: getColor(message.senderUsername || '') }}>
                            {message.senderUsername}
                        </span>
                        <span className="msg-time">
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}

                {/* Reply preview */}
                {message.replyTo && (
                    <div className="reply-preview">
                        <div className="reply-line"></div>
                        <span className="reply-author">{message.replyTo.senderUsername}</span>
                        <span className="reply-text">{message.replyTo.content?.substring(0, 60)}</span>
                    </div>
                )}

                {/* Message body */}
                <div className={`msg-bubble ${isOwn ? 'own' : 'other'}`}>
                    {isFile && file ? (
                        <div className="file-content">
                            {file.mimetype?.startsWith('image/') ? (
                                <img
                                    src={file.url}
                                    alt={file.originalname}
                                    className="msg-image"
                                    onClick={() => onImageClick?.(file.url)}
                                />
                            ) : file.mimetype?.startsWith('video/') ? (
                                <video controls className="msg-video" preload="metadata">
                                    <source src={file.url} type={file.mimetype} />
                                </video>
                            ) : file.mimetype?.startsWith('audio/') ? (
                                <audio controls className="msg-audio" preload="metadata">
                                    <source src={file.url} type={file.mimetype} />
                                </audio>
                            ) : (
                                <a
                                    href={file.url}
                                    download={file.originalname}
                                    className="file-download"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <span className="file-dl-icon">{getFileIcon(file.mimetype, file.originalname)}</span>
                                    <div className="file-dl-info">
                                        <span className="file-dl-name">{file.originalname}</span>
                                        <span className="file-dl-size">{formatFileSize(file.size)} • Click to download</span>
                                    </div>
                                    <Download size={16} className="file-dl-action" />
                                </a>
                            )}
                        </div>
                    ) : (
                        <span
                            className="msg-text"
                            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                        />
                    )}

                    {message.edited && <span className="edited-tag">(edited)</span>}

                    {isOwn && (
                        <span className="msg-time own-time">
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                {/* Reactions */}
                {Object.keys(reactionGroups).length > 0 && (
                    <div className="reactions-row">
                        {Object.values(reactionGroups).map((r) => (
                            <button
                                key={r.emoji}
                                className={`reaction-chip ${r.hasOwn ? 'own' : ''}`}
                                onClick={() => onReact(r.emoji)}
                                title={r.users.join(', ')}
                            >
                                <span>{r.emoji}</span>
                                <span className="reaction-count">{r.count}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Hover actions */}
            {showActions && (
                <div className="msg-actions">
                    <button className="msg-action-btn" onClick={() => setShowReactions(!showReactions)} title="React">
                        <Smile size={14} />
                    </button>
                    <button className="msg-action-btn" onClick={onReply} title="Reply">
                        <Reply size={14} />
                    </button>
                    {message.pinned ? (
                        <button className="msg-action-btn" onClick={onUnpin} title="Unpin">
                            <PinOff size={14} />
                        </button>
                    ) : (
                        <button className="msg-action-btn" onClick={onPin} title="Pin">
                            <Pin size={14} />
                        </button>
                    )}
                    {isOwn && (
                        <button className="msg-action-btn delete" onClick={onDelete} title="Delete">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Quick reaction picker */}
            {showReactions && (
                <div className="quick-reactions">
                    {quickReactions.map((emoji) => (
                        <button
                            key={emoji}
                            className="quick-reaction-btn"
                            onClick={() => { onReact(emoji); setShowReactions(false); }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
