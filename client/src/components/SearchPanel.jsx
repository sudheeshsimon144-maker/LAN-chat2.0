import { useState } from 'react';
import { X, Search as SearchIcon } from 'lucide-react';

export default function SearchPanel({ onClose, token, API_URL }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e?.preventDefault();
        if (query.trim().length < 2) return;
        setLoading(true);
        setSearched(true);

        try {
            const res = await fetch(`${API_URL}/messages/search?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setResults(data.messages);
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content search-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}><X size={20} /></button>

                <h2><SearchIcon size={20} /> Search Messages</h2>

                <form onSubmit={handleSearch} className="search-form">
                    <div className="input-group">
                        <SearchIcon size={18} className="input-icon" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                            minLength={2}
                        />
                    </div>
                    <button type="submit" className="auth-btn" disabled={loading || query.length < 2}>
                        {loading ? <span className="btn-loader"></span> : 'Search'}
                    </button>
                </form>

                <div className="search-results">
                    {loading && <div className="search-loading">Searching...</div>}

                    {searched && !loading && results.length === 0 && (
                        <div className="search-empty">No messages found for "{query}"</div>
                    )}

                    {results.map((msg) => (
                        <div key={msg._id} className="search-result-item">
                            <div className="result-header">
                                <span className="result-username">{msg.senderUsername}</span>
                                <span className="result-room">
                                    {msg.room?.icon} {msg.room?.name}
                                </span>
                                <span className="result-time">
                                    {new Date(msg.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="result-content">{msg.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
