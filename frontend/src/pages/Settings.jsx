import { useState, useEffect } from 'react';
import { useInstances } from '../hooks/useQueue.js';
import { useSabnzbdInstances } from '../hooks/useSabnzbd.js';
import { useQbittorrentInstances } from '../hooks/useQbittorrent.js';
import { useNav } from '../lib/navContext.jsx';
import { useAuth } from '../lib/authContext.jsx';
import { useTestMode } from '../lib/testModeContext.jsx';
import { useLayout } from '../lib/layoutContext.jsx';
import { api } from '../lib/api.js';
import AppNav from '../components/AppNav.jsx';
import styles from './Settings.module.css';

const TYPES = ['sonarr', 'radarr', 'lidarr', 'sportarr'];
const defaultForm   = { name: '', type: 'sonarr', url: '', api_key: '', external_url: '' };
const defaultDcForm = { dcType: 'sabnzbd', name: '', url: '', api_key: '', username: '', password: '' };

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
  const { instances: sabInstances, loading: sabLoading, reload: reloadSab } = useSabnzbdInstances();
  const { instances: qbInstances, loading: qbLoading, reload: reloadQb } = useQbittorrentInstances();
  const { auth, logout } = useAuth();
  const { clearRefresh, setPageTitle, clearPageTitle } = useNav();
  const { testMode, toggle: toggleTestMode } = useTestMode();
  const { horizontalLayout, toggleHorizontal, autoRefresh, toggleAutoRefresh, autoRefreshValue, autoRefreshUnit, setAutoRefreshInterval, tabletMode, toggleTabletMode, hidePending, toggleHidePending, showNavBar, toggleShowNavBar } = useLayout();

  const [tab, setTab] = useState('apps');

  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [dcForm, setDcForm]       = useState(defaultDcForm);
  const [dcErrors, setDcErrors]   = useState({});
  const [dcEditId, setDcEditId]   = useState(null);
  const [dcEditType, setDcEditType] = useState(null);
  const [dcSaving, setDcSaving]   = useState(false);
  const [dcSaveError, setDcSaveError] = useState(null);
  const [dcTesting, setDcTesting] = useState(false);
  const [dcTestResult, setDcTestResult] = useState(null);
  const [showDcForm, setShowDcForm] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    clearRefresh();
    setPageTitle('Settings');
    return () => clearPageTitle();
  }, []);

  function switchTab(t) {
    cancelForm();
    cancelDcForm();
    setTab(t);
  }

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

  function validateDc(form, isEdit) {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.url.trim()) {
      errs.url = 'URL is required';
    } else {
      try { new URL(form.url); } catch { errs.url = 'Enter a valid URL (e.g. http://192.168.1.100:8080)'; }
    }
    if (form.dcType === 'sabnzbd' && !isEdit && !form.api_key.trim()) errs.api_key = 'API key is required';
    return errs;
  }

  function handleDcChange(e) {
    const { name, value } = e.target;
    setDcForm(f => ({ ...f, [name]: value }));
    if (dcErrors[name]) setDcErrors(err => ({ ...err, [name]: undefined }));
    setDcTestResult(null);
  }

  async function handleDcTest() {
    const errs = validateDc(dcForm, !!dcEditId);
    if (Object.keys(errs).length) { setDcErrors(errs); return; }
    setDcTesting(true); setDcTestResult(null);
    const isSab = (dcEditType || dcForm.dcType) === 'sabnzbd';
    try {
      if (dcEditId) {
        const result = isSab ? await api.testSabnzbd(dcEditId) : await api.testQbittorrent(dcEditId);
        setDcTestResult(result.ok ? { ok: true, msg: `Connected · v${result.version}` } : { ok: false, msg: result.error });
      } else if (isSab) {
        const inst = await api.createSabnzbdInstance(dcForm);
        try {
          const result = await api.testSabnzbd(inst.id);
          setDcTestResult(result.ok ? { ok: true, msg: `Connected · v${result.version}` } : { ok: false, msg: result.error });
        } finally { await api.deleteSabnzbdInstance(inst.id); }
      } else {
        const inst = await api.createQbittorrentInstance(dcForm);
        try {
          const result = await api.testQbittorrent(inst.id);
          setDcTestResult(result.ok ? { ok: true, msg: `Connected · v${result.version}` } : { ok: false, msg: result.error });
        } finally { await api.deleteQbittorrentInstance(inst.id); }
      }
    } catch (e) {
      setDcTestResult({ ok: false, msg: e.message });
    } finally {
      setDcTesting(false);
    }
  }

  async function handleDcSave() {
    const errs = validateDc(dcForm, !!dcEditId);
    if (Object.keys(errs).length) { setDcErrors(errs); return; }
    setDcSaving(true); setDcSaveError(null);
    const isSab = (dcEditType || dcForm.dcType) === 'sabnzbd';
    try {
      if (dcEditId) {
        if (isSab) await api.updateSabnzbdInstance(dcEditId, dcForm);
        else await api.updateQbittorrentInstance(dcEditId, dcForm);
      } else {
        if (isSab) await api.createSabnzbdInstance(dcForm);
        else await api.createQbittorrentInstance(dcForm);
      }
      cancelDcForm();
      isSab ? reloadSab() : reloadQb();
    } catch (e) {
      setDcSaveError(e.message);
    } finally {
      setDcSaving(false);
    }
  }

  function startDcEdit(inst, type) {
    setDcEditId(inst.id);
    setDcEditType(type);
    setDcForm(type === 'sabnzbd'
      ? { dcType: 'sabnzbd', name: inst.name, url: inst.url, api_key: '', username: '', password: '' }
      : { dcType: 'qbittorrent', name: inst.name, url: inst.url, api_key: '', username: inst.username || '', password: '' }
    );
    setDcErrors({}); setDcTestResult(null); setDcSaveError(null);
    setShowDcForm(true);
  }

  function cancelDcForm() {
    setDcForm(defaultDcForm); setDcEditId(null); setDcEditType(null);
    setDcErrors({}); setDcTestResult(null); setDcSaveError(null);
    setShowDcForm(false);
  }

  async function handleDcDelete(inst, type) {
    if (!confirm(`Remove this ${type === 'sabnzbd' ? 'SABnzbd' : 'qBittorrent'} instance?`)) return;
    if (type === 'sabnzbd') { await api.deleteSabnzbdInstance(inst.id); reloadSab(); }
    else { await api.deleteQbittorrentInstance(inst.id); reloadQb(); }
  }

  async function toggleDcEnabled(inst, type) {
    if (type === 'sabnzbd') { await api.updateSabnzbdInstance(inst.id, { enabled: !inst.enabled }); reloadSab(); }
    else { await api.updateQbittorrentInstance(inst.id, { enabled: !inst.enabled }); reloadQb(); }
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
      <AppNav />
      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${tab === 'apps'    ? styles.tabActive : ''}`} onClick={() => switchTab('apps')}>Apps</button>
        <button className={`${styles.tab} ${tab === 'account' ? styles.tabActive : ''}`} onClick={() => switchTab('account')}>Account</button>
        <button className={`${styles.tab} ${tab === 'display' ? styles.tabActive : ''}`} onClick={() => switchTab('display')}>Display</button>
      </div>

      {/* ── Apps tab ── */}
      {tab === 'apps' && (
        <div className={styles.displayZones}>

          {/* Instances zone */}
          <div className={styles.displayZone}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Instances</span>
              {!showForm && (
                <button className={styles.addBtn} onClick={() => setShowForm(true)}>
                  <PlusIcon /> Add
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
                      <button className={styles.editBtn} onClick={() => startEdit(inst)}><EditIcon /></button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(inst.id)}><TrashIcon /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Download Clients zone */}
          <div className={styles.displayZone}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Download Clients</span>
              {!showDcForm && (
                <button className={styles.addBtn} onClick={() => setShowDcForm(true)}>
                  <PlusIcon /> Add
                </button>
              )}
            </div>
            {showDcForm && (
              <div className={styles.formCard}>
                <div className={styles.formTitle}>{dcEditId ? `Edit ${dcEditType === 'sabnzbd' ? 'SABnzbd' : 'qBittorrent'}` : 'New Download Client'}</div>
                {!dcEditId && (
                  <Field label="Type">
                    <select name="dcType" value={dcForm.dcType} onChange={handleDcChange}>
                      <option value="sabnzbd">SABnzbd</option>
                      <option value="qbittorrent">qBittorrent</option>
                    </select>
                  </Field>
                )}
                <Field label="Name" error={dcErrors.name}>
                  <input name="name" value={dcForm.name} onChange={handleDcChange}
                    placeholder={dcForm.dcType === 'sabnzbd' ? 'My SABnzbd' : 'My qBittorrent'} autoComplete="off" />
                </Field>
                <Field label="URL" error={dcErrors.url}>
                  <input name="url" value={dcForm.url} onChange={handleDcChange} placeholder="http://192.168.1.100:8080" autoComplete="off" />
                </Field>
                {(dcEditType || dcForm.dcType) === 'sabnzbd' ? (
                  <Field label="API Key" error={dcErrors.api_key}>
                    <input name="api_key" value={dcForm.api_key} onChange={handleDcChange}
                      placeholder={dcEditId ? 'Leave blank to keep existing' : 'Config → General → API Key'} autoComplete="off" />
                  </Field>
                ) : (
                  <>
                    <Field label="Username (optional)" hint="Leave blank if Web UI auth is disabled">
                      <input name="username" value={dcForm.username} onChange={handleDcChange} placeholder="admin" autoComplete="off" />
                    </Field>
                    <Field label="Password (optional)">
                      <input name="password" type="password" value={dcForm.password} onChange={handleDcChange}
                        placeholder={dcEditId ? 'Leave blank to keep existing' : 'Web UI password'} autoComplete="new-password" />
                    </Field>
                  </>
                )}
                {dcTestResult && (
                  <div className={`${styles.testResult} ${dcTestResult.ok ? styles.testOk : styles.testFail}`}>
                    {dcTestResult.ok ? '✓' : '✗'} {dcTestResult.msg}
                  </div>
                )}
                {dcSaveError && <div className={styles.saveError}>{dcSaveError}</div>}
                <div className={styles.formActions}>
                  <button className={styles.testBtn} onClick={handleDcTest} disabled={dcTesting}>
                    {dcTesting ? 'Testing…' : 'Test Connection'}
                  </button>
                  <div className={styles.formActionsRight}>
                    <button className={styles.cancelBtn} onClick={cancelDcForm}>Cancel</button>
                    <button className={styles.saveBtn} onClick={handleDcSave} disabled={dcSaving}>
                      {dcSaving ? 'Saving…' : dcEditId ? 'Update' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {(sabLoading || qbLoading) ? (
              <div className={styles.loadingText}>Loading…</div>
            ) : sabInstances.length === 0 && qbInstances.length === 0 && !showDcForm ? (
              <div className={styles.emptyText}>No download clients configured yet. Tap Add to get started.</div>
            ) : (
              <div className={styles.instanceList}>
                {sabInstances.map(inst => (
                  <div key={`sab-${inst.id}`} className={`${styles.instanceRow} ${!inst.enabled ? styles.disabled : ''}`}>
                    <button className={styles.toggleBtn} onClick={() => toggleDcEnabled(inst, 'sabnzbd')} title={inst.enabled ? 'Disable' : 'Enable'}>
                      <div className={`${styles.toggle} ${inst.enabled ? styles.toggleOn : ''}`}>
                        <div className={styles.toggleThumb} />
                      </div>
                    </button>
                    <div className={styles.instInfo}>
                      <div className={styles.instNameRow}>
                        <span className={styles.instName}>{inst.name}</span>
                        <span className="chip chip-sabnzbd">sabnzbd</span>
                      </div>
                      <div className={styles.instUrl}>{inst.url}</div>
                    </div>
                    <div className={styles.instActions}>
                      <button className={styles.editBtn} onClick={() => startDcEdit(inst, 'sabnzbd')}><EditIcon /></button>
                      <button className={styles.deleteBtn} onClick={() => handleDcDelete(inst, 'sabnzbd')}><TrashIcon /></button>
                    </div>
                  </div>
                ))}
                {qbInstances.map(inst => (
                  <div key={`qb-${inst.id}`} className={`${styles.instanceRow} ${!inst.enabled ? styles.disabled : ''}`}>
                    <button className={styles.toggleBtn} onClick={() => toggleDcEnabled(inst, 'qbittorrent')} title={inst.enabled ? 'Disable' : 'Enable'}>
                      <div className={`${styles.toggle} ${inst.enabled ? styles.toggleOn : ''}`}>
                        <div className={styles.toggleThumb} />
                      </div>
                    </button>
                    <div className={styles.instInfo}>
                      <div className={styles.instNameRow}>
                        <span className={styles.instName}>{inst.name}</span>
                        <span className="chip chip-qbittorrent">qbittorrent</span>
                      </div>
                      <div className={styles.instUrl}>{inst.url}</div>
                    </div>
                    <div className={styles.instActions}>
                      <button className={styles.editBtn} onClick={() => startDcEdit(inst, 'qbittorrent')}><EditIcon /></button>
                      <button className={styles.deleteBtn} onClick={() => handleDcDelete(inst, 'qbittorrent')}><TrashIcon /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Account tab ── */}
      {tab === 'account' && (
        <div className={styles.displayZones}>

          {/* Security zone */}
          <div className={styles.displayZone}>
            <div className={styles.sectionHeader}>
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
          </div>

          {/* Account zone */}
          <div className={styles.displayZone}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Account</span>
            </div>
            <div className={styles.logoutRow}>
              <span className={styles.loggedInAs}>
                Signed in as <strong>{auth?.username}</strong>
              </span>
              <button className={styles.logoutBtn} onClick={logout}>Sign Out</button>
            </div>
          </div>

        </div>
      )}

      {/* ── Display tab ── */}
      {tab === 'display' && (
        <div className={styles.displayZones}>

          {/* Layout zone */}
          <div className={styles.displayZone}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Layout</span>
            </div>
            <div className={styles.instanceRow}>
              <button className={styles.toggleBtn} onClick={toggleHorizontal} title="Toggle horizontal orientation">
                <div className={`${styles.toggle} ${horizontalLayout ? styles.toggleOn : ''}`}>
                  <div className={styles.toggleThumb} />
                </div>
              </button>
              <div className={styles.instInfo}>
                <div className={styles.instNameRow}>
                  <span className={styles.instName}>Horizontal Orientation</span>
                  {horizontalLayout && <span className="chip chip-accent">on</span>}
                </div>
                <div className={styles.instUrl}>Download clients left (40%), instances right (60%) with inline cards</div>
              </div>
            </div>
            <div className={styles.instanceRow}>
              <button className={styles.toggleBtn} onClick={toggleTabletMode} title="Toggle tablet mode">
                <div className={`${styles.toggle} ${tabletMode ? styles.toggleOn : ''}`}>
                  <div className={styles.toggleThumb} />
                </div>
              </button>
              <div className={styles.instInfo}>
                <div className={styles.instNameRow}>
                  <span className={styles.instName}>Tablet Mode</span>
                  {tabletMode && <span className="chip chip-accent">on</span>}
                </div>
                <div className={styles.instUrl}>Dashboard optimised for large-screen tablets — larger text, 70/30 layout, full-height cards</div>
              </div>
            </div>
            <div className={styles.instanceRow}>
              <button className={styles.toggleBtn} onClick={toggleShowNavBar} title="Toggle dashboard nav bar">
                <div className={`${styles.toggle} ${showNavBar ? styles.toggleOn : ''}`}>
                  <div className={styles.toggleThumb} />
                </div>
              </button>
              <div className={styles.instInfo}>
                <div className={styles.instNameRow}>
                  <span className={styles.instName}>Dashboard nav bar</span>
                  {showNavBar && <span className="chip chip-accent">on</span>}
                </div>
                <div className={styles.instUrl}>Show the navigation bar above the dashboard content</div>
              </div>
            </div>
          </div>

          {/* View zone */}
          <div className={styles.displayZone}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>View</span>
            </div>
            <div className={styles.instanceRow}>
              <button className={styles.toggleBtn} onClick={toggleAutoRefresh} title="Toggle auto-refresh">
                <div className={`${styles.toggle} ${autoRefresh ? styles.toggleOn : ''}`}>
                  <div className={styles.toggleThumb} />
                </div>
              </button>
              <div className={styles.instInfo}>
                <div className={styles.refreshRow}>
                  <span className={styles.instName}>Auto-refresh</span>
                  {autoRefresh && <span className="chip chip-accent">on</span>}
                  <div className={styles.refreshControls}>
                    <span className={styles.refreshEvery}>every</span>
                    <input
                      className={styles.refreshValueInput}
                      type="number"
                      min="1"
                      value={autoRefreshValue}
                      onChange={e => setAutoRefreshInterval(e.target.value, autoRefreshUnit)}
                    />
                    <select
                      className={styles.refreshUnitSelect}
                      value={autoRefreshUnit}
                      onChange={e => setAutoRefreshInterval(autoRefreshValue, e.target.value)}
                    >
                      <option value="seconds">seconds</option>
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.instanceRow}>
              <button className={styles.toggleBtn} onClick={toggleHidePending} title="Toggle hide pending downloads">
                <div className={`${styles.toggle} ${hidePending ? styles.toggleOn : ''}`}>
                  <div className={styles.toggleThumb} />
                </div>
              </button>
              <div className={styles.instInfo}>
                <div className={styles.instNameRow}>
                  <span className={styles.instName}>Hide pending downloads</span>
                  {hidePending && <span className="chip chip-accent">on</span>}
                </div>
                <div className={styles.instUrl}>Filter out delayed or scheduled items from queue views</div>
              </div>
            </div>
          </div>

          {/* Developer zone */}
          <div className={styles.displayZone}>
            <div className={styles.sectionHeader}>
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
            <div className={styles.reloadRow}>
              <span className={styles.reloadLabel}>Reload the app</span>
              <button className={styles.reloadBtn} onClick={() => window.location.reload()}>Reload</button>
            </div>
            <div className={styles.reloadRow}>
              <span className={styles.reloadLabel}>Reload all devices</span>
              <button className={styles.reloadBtn} onClick={async () => {
                await api.triggerReload().catch(() => {});
                window.location.reload();
              }}>Reload all</button>
            </div>
          </div>

        </div>
      )}
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

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);
