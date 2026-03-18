import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from './api';
import './Profile.css';

function StreakBadge({ current, longest }) {
  return (
    <div className="prof-streak-row">
      <div className="prof-streak-badge">
        <span className="prof-streak-fire">🔥</span>
        <span className="prof-streak-num">{current}</span>
        <span className="prof-streak-lbl">Current Streak</span>
      </div>
      <div className="prof-streak-badge prof-streak-badge--best">
        <span className="prof-streak-fire">🏆</span>
        <span className="prof-streak-num">{longest}</span>
        <span className="prof-streak-lbl">Longest Streak</span>
      </div>
    </div>
  );
}

export default function Profile({ user, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [bio, setBio] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      await updateProfile({ bio, height, weight, tags, avatar_url: avatarUrl });
      setProfile((p) => ({ ...p, bio, height, weight, tags, avatar_url: avatarUrl }));
      setMsg('✅ Profile saved!');
    } catch {
      setMsg('❌ Failed to save profile.');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

  if (loading) {
    return (
      <div className="prof-page">
        <div className="prof-loading">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="prof-page">
      <header className="prof-header">
        <button className="prof-back-btn" onClick={onBack}>← Back</button>
        <h1 className="prof-title">My Profile</h1>
      </header>

      <div className="prof-hero">
        {avatarUrl ? (
          <img className="prof-avatar" src={avatarUrl} alt={user?.username} onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="prof-avatar-placeholder">{initials}</div>
        )}
        <div className="prof-username">@{user?.username}</div>
        <div className="prof-member-since">Member since {new Date(user?.created_at || profile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
      </div>

      <StreakBadge current={profile?.current_streak ?? 0} longest={profile?.longest_streak ?? 0} />

      <form className="prof-form wl-card" onSubmit={handleSave}>
        <h2 className="wl-section-title">✏️ Edit Profile</h2>

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
              placeholder="e.g. 6ft 1in or 185cm"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              maxLength={30}
            />
          </label>
          <label className="prof-label">
            Weight
            <input
              className="wl-input"
              placeholder="e.g. 185 lbs or 84kg"
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
            placeholder="e.g. powerlifter, calisthenics, beginner"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            maxLength={200}
          />
        </label>
        {tagsInput && (
          <div className="prof-tags-preview">
            {tagsInput.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
              <span key={tag} className="prof-tag">{tag}</span>
            ))}
          </div>
        )}

        <label className="prof-label">
          Avatar URL <span className="prof-hint">(link to an image)</span>
          <input
            className="wl-input"
            type="url"
            placeholder="https://example.com/my-photo.jpg"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </label>

        {msg && <p className="prof-msg">{msg}</p>}

        <button type="submit" className="wl-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Profile'}
        </button>
      </form>
    </div>
  );
}
