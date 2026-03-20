import { useState, useEffect, useRef } from 'react';
import { getProfile, updateProfile } from './api';
import './Profile.css';

export default function Profile({ user, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const [bio, setBio] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const msgTimerRef = useRef(null);

  useEffect(() => {
    let live = true;
    getProfile()
      .then((data) => {
        if (!live) return;
        setProfile(data);
        setBio(data.bio || '');
        setHeight(data.height || '');
        setWeight(data.weight || '');
        setTagsInput((data.tags || []).join(', '));
        setAvatarUrl(data.avatar_url || '');
        setLoading(false);
      })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => () => { if (msgTimerRef.current) clearTimeout(msgTimerRef.current); }, []);

  const scheduleMsg = (fn, delay) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(fn, delay);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      await updateProfile({ bio, height, weight, tags, avatar_url: avatarUrl });
      setProfile((p) => ({ ...p, bio, height, weight, tags, avatar_url: avatarUrl }));
      setMsg('✅ Saved!');
      scheduleMsg(() => { setMsg(''); setEditOpen(false); }, 1500);
    } catch {
      setMsg('❌ Failed to save.');
      scheduleMsg(() => setMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';
  const memberSince = new Date(user?.created_at || profile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const tags = profile?.tags || [];

  if (loading) {
    return (
      <div className="prof-page">
        <div className="prof-loading">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="prof-page">
      {/* ── Top Bar ── */}
      <header className="prof-topbar">
        <button className="prof-back-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
        <span className="prof-topbar-title">Profile</span>
        <button
          className="prof-edit-toggle"
          onClick={() => setEditOpen((v) => !v)}
          aria-label={editOpen ? 'Close editor' : 'Edit profile'}
        >
          {editOpen ? '✕' : '✏️'}
        </button>
      </header>

      {/* ── Hero Card ── */}
      <div className="prof-hero-card">
        <div className="prof-hero-bg" />
        <div className="prof-hero-body">
          {avatarUrl ? (
            <img
              className="prof-avatar"
              src={avatarUrl}
              alt={user?.username}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="prof-avatar-placeholder">{initials}</div>
          )}
          <div className="prof-username">@{user?.username}</div>
          {profile?.bio && <p className="prof-bio">{profile.bio}</p>}
          <div className="prof-member-since">Member since {memberSince}</div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="prof-stats-row">
        <div className="prof-stat-card">
          <span className="prof-stat-icon">🔥</span>
          <span className="prof-stat-val">{profile?.current_streak ?? 0}</span>
          <span className="prof-stat-lbl">Current Streak</span>
        </div>
        <div className="prof-stat-card prof-stat-card--gold">
          <span className="prof-stat-icon">🏆</span>
          <span className="prof-stat-val">{profile?.longest_streak ?? 0}</span>
          <span className="prof-stat-lbl">Best Streak</span>
        </div>
        {profile?.height && (
          <div className="prof-stat-card">
            <span className="prof-stat-icon">📏</span>
            <span className="prof-stat-val prof-stat-val--sm">{profile.height}</span>
            <span className="prof-stat-lbl">Height</span>
          </div>
        )}
        {profile?.weight && (
          <div className="prof-stat-card">
            <span className="prof-stat-icon">⚖️</span>
            <span className="prof-stat-val prof-stat-val--sm">{profile.weight}</span>
            <span className="prof-stat-lbl">Weight</span>
          </div>
        )}
      </div>

      {/* ── Tags ── */}
      {tags.length > 0 && (
        <div className="prof-tags-row">
          {tags.map((tag) => (
            <span key={tag} className="prof-tag">{tag}</span>
          ))}
        </div>
      )}

      {/* ── Edit Panel ── */}
      {editOpen && (
        <form className="prof-edit-panel wl-card" onSubmit={handleSave}>
          <h2 className="prof-edit-title">Edit Profile</h2>

          <label className="prof-label">
            Bio
            <textarea
              className="prof-textarea"
              placeholder="Tell people about yourself…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={300}
            />
          </label>

          <div className="prof-form-row">
            <label className="prof-label">
              Height
              <input
                className="wl-input"
                placeholder="e.g. 6ft 1in"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                maxLength={30}
              />
            </label>
            <label className="prof-label">
              Weight
              <input
                className="wl-input"
                placeholder="e.g. 185 lbs"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                maxLength={30}
              />
            </label>
          </div>

          <label className="prof-label">
            Tags <span className="prof-hint">(comma-separated)</span>
            <input
              className="wl-input"
              placeholder="e.g. powerlifter, beginner"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              maxLength={200}
            />
          </label>

          <label className="prof-label">
            Avatar URL <span className="prof-hint">(link to an image)</span>
            <input
              className="wl-input"
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </label>

          {msg && <p className="prof-msg">{msg}</p>}

          <button type="submit" className="wl-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>
        </form>
      )}
    </div>
  );
}
