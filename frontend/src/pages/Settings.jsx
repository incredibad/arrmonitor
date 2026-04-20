import { useState, useEffect } from 'react';
import { useInstances } from '../hooks/useQueue.js';
import { useNav } from '../lib/navContext.jsx';
import { useAuth } from '../lib/authContext.jsx';
import { useTestMode } from '../lib/testModeContext.jsx';
import { api } from '../lib/api.js';
import styles from './Settings.module.css';

const TYPES = ['sonarr', 'radarr', 'lidarr', 'sportarr'];
const defaultForm = { name: '', type: 'sonarr', url: '', api_key: '', external_url: '' };

function validate(form, isEdit) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  if (!form.url.trim()) {
    errors.url = 'URL is required';
  } else {
    try { new URL(form.url); } catch { errors.url = 'Enter a valid URL (e.g. http://192.168.1.100:8989)'; }
  }
  if (!isEdit && !form.api_key.trim()) errors.api_key = 'API key is required';
  return errors;
}

export default function Settings() {
  const { instances, loading, reload } = useInstances();
  const { auth, logout } = useAuth();
  const { clearRefresh, setPageTitle, clearPageTitle } = useNav();
  const { testMode, toggle: toggleTestMode } = useTestMode();

  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    clearRefresh();
    setPageTitle('Settings');
    return () => clearPageTitle();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: undefined }));
    setTestResult(null);
  }

  async function handleTest() {
    const errs = validate(form, !!editId);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setTesting(true);
    setTestResult(null);
    try {
      if (editId) {
        const status = await api.getStatus(editId);
        setTestResult(status.ok
          ? { ok: true, msg: `Connected · ${status.appName} v${status.version}` }
          : { ok: false, msg: status.error || 'Could not connect' });
      } else {
        const inst = await api.createInstance(form);
        try {
          const status = await api.getStatus(inst.id);
          setTestResult(status.ok
            ? { ok: true, msg: `Connected · ${status.appName} v${status.version}` }
            : { ok: false, msg: status.error || 'Could not connect' });
        } finally {
          await api.deleteInstance(inst.id);
        }
      }
    } catch (e) {
      setTestResult({ ok: false, msg: e.message });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    const errs = validate(form, !!editId);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setSaveError(null);
    try {
      if (editId) {
        await api.updateInstance(editId, form);
      } else {
        await api.createInstance(form);
      }
      cancelForm();
      reload();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(inst) {
    setEditId(inst.id);
    setForm({ name: inst.name, type: inst.type, url: inst.url, api_key: '', external_url: inst.external_url || '' });
    setErrors({});
    setTestResult(null);
    setSaveError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setForm(defaultForm);
    setEditId(null);
    setErrors({});
    setTestResult(null);
    setSaveError(null);
    setShowForm(false);
  }

  async function handleDelete(id) {
    if (!confirm('Remove this instance?')) return;
    await api.deleteInstance(id);
    reload();
  }

  async function toggleEnabled(inst) {
    await api.updateInstance(inst.id, { enabled: !inst.enabled });
    reload();
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (pwForm.next !== pwForm.confirm) return setPwError('Passwords do not match');
    if (pwForm.next.length < 8) return setPwError('Password must be at least 8 characters');
    setPwLoading(true);
    try {
      await api.changePassword(pwForm.current, pwForm.next);
      setPwSuccess(true);
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (e) {
      setPwError(e.message);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.subBar}>
        <span className={styles.subBarTitle}>Settings</span>
      </div>

      <div className={styles.section}>

        {/* ── Instances ── */}
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Instances</span>
          {!showForm && (
            <button className={styles.addBtn} onClick={() => setShowForm(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add
            </button>
          )}
        </div>

        {showForm && (
          <div className={styles.formCard}>
            <div className={styles.formTitle}>{editId ? 'Edit Instance' : 'New Instance'}</div>
            <Field label="Name" error={errors.name}>
              <input name="name" value={form.name} onChange={handleChange} placeholder="My Sonarr" autoComplete="off" />
            </Field>
            <Field label="Type">
              <select name="type" value={form.type} onChange={handleChange}>
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="URL" error={errors.url}>
              <input name="url" value={form.url} onChange={handleChange} placeholder="http://192.168.1.100:8989" autoComplete="off" />
            </Field>
            <Field label="API Key" error={errors.api_key}>
              <input name="api_key" value={form.api_key} onChange={handleChange}
                placeholder={editId ? 'Leave blank to keep existing' : 'Paste your API key'} autoComplete="off" />
            </Field>
            <Field label="External URL (optional)" hint="Override the link button — useful for reverse proxies">
              <input name="external_url" value={form.external_url} onChange={handleChange}
                placeholder="https://sonarr.yourdomain.com" autoComplete="off" />
            </Field>
            {testResult && (
              <div className={`${styles.testResult} ${testResult.ok ? styles.testOk : styles.testFail}`}>
                {testResult.ok ? '✓' : '✗'} {testResult.msg}
              </div>
            )}
            {saveError && <div className={styles.saveError}>{saveError}</div>}
            <div className={styles.formActions}>
              <button className={styles.testBtn} onClick={handleTest} disabled={testing}>
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
              <div className={styles.formActionsRight}>
                <button className={styles.cancelBtn} onClick={cancelForm}>Cancel</button>
                <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingText}>Loading…</div>
        ) : instances.length === 0 && !showForm ? (
          <div className={styles.emptyText}>No instances configured yet. Tap Add to get started.</div>
        ) : (
          <div className={styles.instanceList}>
            {instances.map(inst => (
              <div key={inst.id} className={`${styles.instanceRow} ${!inst.enabled ? styles.disabled : ''}`}>
                <button className={styles.toggleBtn} onClick={() => toggleEnabled(inst)} title={inst.enabled ? 'Disable' : 'Enable'}>
                  <div className={`${styles.toggle} ${inst.enabled ? styles.toggleOn : ''}`}>
                    <div className={styles.toggleThumb} />
                  </div>
                </button>
                <div className={styles.instInfo}>
                  <div className={styles.instNameRow}>
                    <span className={styles.instName}>{inst.name}</span>
                    <span className={`chip chip-${inst.type}`}>{inst.type}</span>
                  </div>
                  <div className={styles.instUrl}>{inst.url}</div>
                </div>
                <div className={styles.instActions}>
                  <button className={styles.editBtn} onClick={() => startEdit(inst)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(inst.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Security ── */}
        <div className={styles.sectionHeader} style={{ marginTop: 20 }}>
          <span className={styles.sectionLabel}>Security</span>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formTitle}>Change Password</div>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Current Password">
              <input type="password" value={pwForm.current} autoComplete="current-password"
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                placeholder="Current password" />
            </Field>
            <Field label="New Password">
              <input type="password" value={pwForm.next} autoComplete="new-password"
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                placeholder="At least 8 characters" />
            </Field>
            <Field label="Confirm New Password">
              <input type="password" value={pwForm.confirm} autoComplete="new-password"
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password" />
            </Field>
            {pwError && <div className={`${styles.testResult} ${styles.testFail}`}>{pwError}</div>}
            {pwSuccess && <div className={`${styles.testResult} ${styles.testOk}`}>✓ Password updated</div>}
            <div className={styles.formActions}>
              <div />
              <div className={styles.formActionsRight}>
                <button type="submit" className={styles.saveBtn} disabled={pwLoading}>
                  {pwLoading ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── Developer ── */}
        <div className={styles.sectionHeader} style={{ marginTop: 20 }}>
          <span className={styles.sectionLabel}>Developer</span>
        </div>
        <div className={styles.instanceRow}>
          <button className={styles.toggleBtn} onClick={toggleTestMode} title="Toggle test mode">
            <div className={`${styles.toggle} ${testMode ? styles.toggleOn : ''}`}>
              <div className={styles.toggleThumb} />
            </div>
          </button>
          <div className={styles.instInfo}>
            <div className={styles.instNameRow}>
              <span className={styles.instName}>Test Mode</span>
              {testMode && <span className="chip chip-yellow">active</span>}
            </div>
            <div className={styles.instUrl}>Populate all queue views with simulated data</div>
          </div>
        </div>

        {/* ── Account ── */}
        <div className={styles.logoutRow}>
          <span className={styles.loggedInAs}>
            Signed in as <strong>{auth?.username}</strong>
          </span>
          <button className={styles.logoutBtn} onClick={logout}>Sign Out</button>
        </div>

      </div>
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', letterSpacing: '0.03em' }}>{label}</label>
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: 'var(--red)', marginTop: 2 }}>{error}</span>}
    </div>
  );
}
