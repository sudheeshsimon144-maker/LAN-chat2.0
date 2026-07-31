import { useState } from 'react';
import { X } from 'lucide-react';

const emojiCategories = {
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯'],
    'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    'Objects': ['🔥', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💡', '🔔', '🎵', '🎶', '💻', '📱', '⌨️', '🖥️', '📷', '📸', '🎮', '🕹️', '🎲'],
    'Food': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🍖', '🍗', '☕', '🍵', '🥤', '🧃', '🍺', '🍻', '🥂', '🍷', '🍸', '🍹', '🍾', '🧊'],
};

export default function EmojiPicker({ onSelect, onClose }) {
    const [activeTab, setActiveTab] = useState('Smileys');

    return (
        <div className="emoji-picker-container">
            <div className="emoji-picker">
                <div className="emoji-header">
                    <span>Emoji</span>
                    <button className="icon-btn" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="emoji-tabs">
                    {Object.keys(emojiCategories).map((cat) => (
                        <button
                            key={cat}
                            className={`emoji-tab ${activeTab === cat ? 'active' : ''}`}
                            onClick={() => setActiveTab(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="emoji-grid">
                    {emojiCategories[activeTab].map((emoji) => (
                        <button
                            key={emoji}
                            className="emoji-btn"
                            onClick={() => onSelect(emoji)}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
