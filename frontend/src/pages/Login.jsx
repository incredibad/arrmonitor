import { useState } from 'react';
import { useAuth } from '../lib/authContext.jsx';
import styles from './Login.module.css';

export default function Login() {
  const { auth, login, setup } = useAuth();
  const isSetup = auth && !auth.hasUsers;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (isSetup) {
      if (password !== confirmPassword) return setError('Passwords do not match');
      if (password.length < 8) return setError('Password must be at least 8 characters');
    }
    if (!username.trim() || !password) return setError('All fields are required');
    setLoading(true);
    try {
      if (isSetup) {
        await setup(username, password);
      } else {
        await login(username, password);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoArr}>Arr</span><span className={styles.logoMonitor}>Monitor</span>
        </div>

        <h1 className={styles.title}>{isSetup ? 'Create Account' : 'Sign In'}</h1>
        <p className={styles.sub}>
          {isSetup
            ? 'No users exist yet. Set up your credentials to get started.'
            : 'Sign in to access ArrMonitor.'}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSetup ? 'At least 8 characters' : 'Enter password'}
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              disabled={loading}
            />
          </div>

          {isSetup && (
            <div className={styles.field}>
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Please wait…' : isSetup ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
