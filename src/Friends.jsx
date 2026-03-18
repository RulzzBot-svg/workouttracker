import { useState, useEffect } from 'react';
import {
  getFriends, getFriendRequests, searchUsers,
  sendFriendRequest, acceptFriendRequest,
  declineFriendRequest, removeFriend,
} from './api';
import './Friends.css';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

function UserAvatar({ username, avatarUrl }) {
  const initials = (username || '?').slice(0, 2).toUpperCase();
  if (avatarUrl) {
    return <img className="fr-avatar" src={avatarUrl} alt={username} onError={(e) => { e.target.style.display = 'none'; }} />;
  }
  return <div className="fr-avatar fr-avatar-placeholder">{initials}</div>;
}

export default function Friends({ onBack }) {
  const [tab, setTab] = useState('friends'); // 'friends' | 'requests' | 'search'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const refresh = () => {
    Promise.all([getFriends(), getFriendRequests()])
      .then(([f, r]) => { setFriends(f); setRequests(r); })
      .catch(() => {});
  };

  useEffect(() => {
    let live = true;
    Promise.all([getFriends(), getFriendRequests()])
      .then(([f, r]) => {
        if (!live) return;
        setFriends(f);
        setRequests(r);
        setLoading(false);
      })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const q = searchQ.trim();
    const t = setTimeout(() => {
      if (!q || q.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      searchUsers(q)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleSendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId);
      showMsg('✅ Friend request sent!');
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      await acceptFriendRequest(friendshipId);
      refresh();
      showMsg('✅ Friend added!');
    } catch {
      showMsg('❌ Failed to accept request.');
    }
  };

  const handleDecline = async (friendshipId) => {
    try {
      await declineFriendRequest(friendshipId);
      refresh();
    } catch {
      showMsg('❌ Failed to decline request.');
    }
  };

  const handleRemove = async (friendshipId) => {
    if (!window.confirm('Remove this friend?')) return;
    try {
      await removeFriend(friendshipId);
      setFriends((prev) => prev.filter((f) => f.friendship_id !== friendshipId));
      showMsg('🗑️ Friend removed.');
    } catch {
      showMsg('❌ Failed to remove friend.');
    }
  };

  const onlineCount = friends.filter((f) => isOnline(f.friend_last_seen)).length;
  const pendingCount = requests.incoming.length;

  return (
    <div className="fr-page">
      <header className="fr-header">
        <button className="fr-back-btn" onClick={onBack}>← Back</button>
        <h1 className="fr-title">Friends</h1>
      </header>

      {msg && <div className="fr-toast">{msg}</div>}

      <div className="fr-tabs">
        <button className={`fr-tab${tab === 'friends' ? ' active' : ''}`} onClick={() => setTab('friends')}>
          Friends {onlineCount > 0 && <span className="fr-online-dot" title={`${onlineCount} online`} />}
        </button>
        <button className={`fr-tab${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
          Requests {pendingCount > 0 && <span className="fr-badge">{pendingCount}</span>}
        </button>
        <button className={`fr-tab${tab === 'search' ? ' active' : ''}`} onClick={() => setTab('search')}>
          Find People
        </button>
      </div>

      {tab === 'friends' && (
        <div className="fr-section">
          {loading ? (
            <p className="fr-empty">Loading…</p>
          ) : friends.length === 0 ? (
            <div className="fr-empty-state">
              <span className="fr-empty-icon">👥</span>
              <p>No friends yet. Use &apos;Find People&apos; to add some!</p>
            </div>
          ) : (
            <ul className="fr-list">
              {friends.map((f) => {
                const online = isOnline(f.friend_last_seen);
                return (
                  <li key={f.friendship_id} className="fr-item">
                    <div className="fr-item-left">
                      <div className="fr-avatar-wrap">
                        <UserAvatar username={f.friend_username} avatarUrl={f.friend_avatar_url} />
                        <span className={`fr-status-dot${online ? ' online' : ''}`} title={online ? 'Online' : 'Offline'} />
                      </div>
                      <div className="fr-item-info">
                        <span className="fr-item-name">{f.friend_username}</span>
                        <span className="fr-item-status">{online ? '🟢 Online' : '⚫ Offline'}</span>
                      </div>
                    </div>
                    <button
                      className="fr-remove-btn"
                      onClick={() => handleRemove(f.friendship_id)}
                      title="Remove friend"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="fr-section">
          {loading ? (
            <p className="fr-empty">Loading…</p>
          ) : (
            <>
              {requests.incoming.length > 0 && (
                <>
                  <h3 className="fr-subsection-title">Incoming Requests</h3>
                  <ul className="fr-list">
                    {requests.incoming.map((r) => (
                      <li key={r.friendship_id} className="fr-item">
                        <div className="fr-item-left">
                          <UserAvatar username={r.requester_username} avatarUrl={r.requester_avatar_url} />
                          <span className="fr-item-name">{r.requester_username}</span>
                        </div>
                        <div className="fr-request-btns">
                          <button className="fr-accept-btn" onClick={() => handleAccept(r.friendship_id)}>Accept</button>
                          <button className="fr-decline-btn" onClick={() => handleDecline(r.friendship_id)}>Decline</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {requests.outgoing.length > 0 && (
                <>
                  <h3 className="fr-subsection-title">Sent Requests</h3>
                  <ul className="fr-list">
                    {requests.outgoing.map((r) => (
                      <li key={r.friendship_id} className="fr-item">
                        <div className="fr-item-left">
                          <UserAvatar username={r.addressee_username} avatarUrl={r.addressee_avatar_url} />
                          <span className="fr-item-name">{r.addressee_username}</span>
                        </div>
                        <span className="fr-pending-label">Pending</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {requests.incoming.length === 0 && requests.outgoing.length === 0 && (
                <div className="fr-empty-state">
                  <span className="fr-empty-icon">📬</span>
                  <p>No pending friend requests.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'search' && (
        <div className="fr-section">
          <div className="fr-search-wrap">
            <input
              className="fr-search-input wl-input"
              placeholder="Search by username…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
          </div>
          {searching && <p className="fr-empty">Searching…</p>}
          {!searching && searchQ.trim().length >= 2 && searchResults.length === 0 && (
            <p className="fr-empty">No users found.</p>
          )}
          {searchResults.length > 0 && (
            <ul className="fr-list">
              {searchResults.map((u) => (
                <li key={u.id} className="fr-item">
                  <div className="fr-item-left">
                    <div className="fr-avatar-wrap">
                      <UserAvatar username={u.username} avatarUrl={u.avatar_url} />
                      <span className={`fr-status-dot${isOnline(u.last_seen) ? ' online' : ''}`} />
                    </div>
                    <div className="fr-item-info">
                      <span className="fr-item-name">{u.username}</span>
                      <span className="fr-item-status">{isOnline(u.last_seen) ? '🟢 Online' : '⚫ Offline'}</span>
                    </div>
                  </div>
                  <button
                    className="fr-add-btn"
                    onClick={() => handleSendRequest(u.id)}
                  >
                    + Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
