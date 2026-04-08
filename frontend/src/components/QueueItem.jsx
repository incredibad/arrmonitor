import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import styles from './QueueItem.module.css';

function formatBytes(bytes) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

function formatEta(estimatedCompletionTime) {
  if (!estimatedCompletionTime) return null;
  const secs = Math.floor((new Date(estimatedCompletionTime) - Date.now()) / 1000);
  if (secs < 0) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function getTitle(item) {
  if (item.series) return item.series.title;
  if (item.movie) return item.movie.title;
  if (item.artist) return item.artist.artistName;
  return item.title || item.sourceTitle || 'Unknown';
}

// Returns episode/album/track subtitle
export function getSubtitle(item) {
  if (item.series && item.episode) {
    const code = `S${String(item.episode.seasonNumber).padStart(2,'0')}E${String(item.episode.episodeNumber).padStart(2,'0')}`;
    return item.episode.title ? `${code} · ${item.episode.title}` : code;
  }
  if (item.artist && item.album) return item.album.title;
  return null;
}

function getSemanticStatus(item) {
  const s = v => (typeof v === 'string' ? v : String(v ?? '')).toLowerCase();
  const tStatus = s(item.trackedDownloadStatus);
  const tState  = s(item.trackedDownloadState);
  const status  = s(item.status);
  // Actual failures/errors → issue (red)
  if (tStatus === 'warning' || tStatus === 'error') return 'issue';
  if (status === 'failed' || tState === 'failed' || tState === 'failedpending') return 'issue';
  // Actively being processed → importing (light blue)
  if (tState === 'importing') return 'importing';
  // Downloaded, queued for import → waiting (purple)
  if (tState === 'importpending') return 'waiting';
  if (status === 'completed') return 'waiting';
  // Normal download states — check paused before downloading
  if (status === 'paused') return 'paused';
  if (status === 'downloading' || tState === 'downloading') return 'downloading';
  return 'queued';
}

function statusLabel(sem) {
  return {
    downloading: 'Downloading',
    paused:      'Paused',
    importing:   'Importing',
    waiting:     'Waiting to Import',
    issue:       'Issue',
    queued:      'Queued',
  }[sem] || sem;
}

function statusChipClass(sem) {
  return `chip chip-${sem}`;
}

// Only show manual import button when item has an issue
function needsManualImport(item) {
  return getSemanticStatus(item) === 'issue';
}

// ─── Manual Import Confirmation Modal ────────────────────────────────────────
function ManualImportModal({ item, instanceId, instanceType, onClose, onDone }) {
  const [candidates, setCandidates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState('move');

  // Fetch candidates on mount
  useEffect(() => {
    let cancelled = false;
    api.getManualImportCandidates(instanceId, item.downloadId)
      .then(data => {
        if (cancelled) return;
        setCandidates(Array.isArray(data) ? data : []);
        // Pre-select all valid candidates
        const sel = {};
        (Array.isArray(data) ? data : []).forEach((c, i) => {
          if (c.series || c.movie || c.artist) sel[i] = true;
        });
        setSelected(sel);
        setLoading(false);
      })
      .catch(e => {
        if (!cancelled) { setError(e.message); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  async function doImport() {
    if (!candidates) return;
    setImporting(true);
    try {
      // All *arr apps use POST /command with name:"ManualImport"
      // but the file object fields differ per app type.
      const files = candidates
        .filter((_, i) => selected[i])
        .map(c => {
          // Common fields for all types
          const base = {
            path: c.path,
            quality: c.quality,
            languages: c.languages ?? [],
            releaseGroup: c.releaseGroup ?? '',
            downloadId: c.downloadId ?? item.downloadId,
          };

          if (instanceType === 'radarr') {
            // Radarr: needs movieId — confirmed from Radarr source/community docs
            return {
              ...base,
              movieId: c.movie?.id ?? c.movieId,
            };
          }

          if (instanceType === 'lidarr') {
            // Lidarr: needs artistId, albumId, trackIds
            return {
              ...base,
              artistId: c.artist?.id ?? c.artistId,
              albumId: c.album?.id ?? c.albumId,
              trackIds: c.tracks?.map(t => t.id) ?? c.trackIds ?? [],
            };
          }

          // Sonarr (default) and Sportarr: needs seriesId, seasonNumber, episodeIds
          return {
            ...base,
            seriesId: c.series?.id ?? c.seriesId,
            seasonNumber: c.seasonNumber ?? c.episodes?.[0]?.seasonNumber,
            episodeIds: c.episodes?.map(e => e.id) ?? c.episodeIds ?? [],
          };
        });

      await api.sendCommand(instanceId, { name: 'ManualImport', files, importMode });
      onDone();
      onClose();
    } catch (e) {
      setError(e.message);
      setImporting(false);
    }
  }

  const title = getTitle(item);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-sheet ${styles.importSheet}`} onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">Manual Import</div>
          <span className="modal-subtitle">{title}</span>
        </div>

        <div className={styles.importBody}>
          {loading ? (
            <div className={styles.importLoading}>
              <div className={styles.importSpinner} />
              <span>Scanning files…</span>
            </div>
          ) : error ? (
            <div className={styles.importError}>⚠ {error}</div>
          ) : candidates?.length === 0 ? (
            <div className={styles.importEmpty}>No importable files found</div>
          ) : (
            <>
              <div className={styles.importModeRow}>
                <span className={styles.importModeLabel}>Import mode</span>
                <div className={styles.importModeToggle}>
                  {['move', 'copy', 'hardlink'].map(m => (
                    <button
                      key={m}
                      className={`${styles.modeBtn} ${importMode === m ? styles.modeBtnActive : ''}`}
                      onClick={() => setImportMode(m)}
                    >{m}</button>
                  ))}
                </div>
              </div>

              <div className={styles.candidateList}>
                {candidates.map((c, i) => {
                  const valid = !!(c.series || c.movie || c.artist);
                  const epLabel = c.episodes?.length
                    ? c.episodes.map(e => `S${String(e.seasonNumber).padStart(2,'0')}E${String(e.episodeNumber).padStart(2,'0')}`).join(', ')
                    : null;
                  return (
                    <label key={i} className={`${styles.candidate} ${!valid ? styles.candidateInvalid : ''}`}>
                      <input
                        type="checkbox"
                        checked={!!selected[i]}
                        disabled={!valid}
                        onChange={e => setSelected(s => ({ ...s, [i]: e.target.checked }))}
                        className={styles.candidateCheck}
                      />
                      <div className={styles.candidateInfo}>
                        <div className={styles.candidatePath}>{c.relativePath || c.path?.split('/').pop()}</div>
                        <div className={styles.candidateMeta}>
                          {(c.series?.title || c.movie?.title || c.artist?.artistName) && (
                            <span className={styles.candidateMatch}>
                              {c.series?.title || c.movie?.title || c.artist?.artistName}
                              {epLabel && ` · ${epLabel}`}
                            </span>
                          )}
                          {c.quality?.quality?.name && <span className="chip chip-neutral">{c.quality.quality.name}</span>}
                          {c.size > 0 && <span className={styles.candidateSize}>{formatBytes(c.size)}</span>}
                          {!valid && <span className="chip chip-red">Unmatched</span>}
                          {c.customFormatScore != null && c.customFormatScore !== 0 && (
                            <span className={`chip ${c.customFormatScore > 0 ? 'chip-green' : 'chip-red'}`}>
                              CF {c.customFormatScore > 0 ? '+' : ''}{c.customFormatScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {!loading && !error && candidates?.length > 0 && (
          <div className={styles.importFooter}>
            <button className="modal-cancel" style={{ margin: 0, flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              className={styles.importConfirmBtn}
              onClick={doImport}
              disabled={importing || selectedCount === 0}
            >
              {importing ? 'Importing…' : `Import ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
        {(loading || error || candidates?.length === 0) && (
          <button className="modal-cancel" onClick={onClose}>Close</button>
        )}
      </div>
    </div>
  );
}

// ─── Remove Confirmation Modal ────────────────────────────────────────────────
function RemoveModal({ item, onClose, onRemove, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const title = getTitle(item);

  async function doRemove(blacklist) {
    setBusy(true);
    try {
      await onRemove(item.id, { blacklist, skipRedownload: false });
      onClose();
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">Remove from Queue</div>
          <span className="modal-subtitle">{title}</span>
        </div>
        <button className="modal-action danger" onClick={() => doRemove(true)} disabled={busy}>
          <span className="modal-action-icon"><BlockIcon /></span>
          <div className="modal-action-label">
            <div>{busy ? 'Removing…' : 'Remove & Blacklist'}</div>
            <div className="modal-action-desc">Remove and block this release from being grabbed again</div>
          </div>
        </button>
        <button className="modal-action danger" onClick={() => doRemove(false)} disabled={busy}>
          <span className="modal-action-icon"><TrashIcon /></span>
          <div className="modal-action-label">
            <div>{busy ? 'Removing…' : 'Remove Only'}</div>
            <div className="modal-action-desc">Remove without blacklisting</div>
          </div>
        </button>
        <button className="modal-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Release Title Tag — truncated with click-to-expand tooltip ─────────────
function ReleaseTitleTag({ title }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button
        className={styles.metaFile}
        onClick={e => { e.stopPropagation(); setExpanded(true); }}
        title={title}
      >
        {title}
      </button>
      {expanded && (
        <div className="modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="modal-title" style={{ fontSize: 13, wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontWeight: 400 }}>
                {title}
              </div>
            </div>
            <button className="modal-cancel" onClick={() => setExpanded(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Warning Tag ──────────────────────────────────────────────────────────────
function WarningTag({ messages }) {
  const [open, setOpen] = useState(false);
  const allMessages = messages.flatMap(m =>
    m.messages?.length ? m.messages.map(msg => `${m.title}: ${msg}`) : [m.title]
  ).filter(Boolean);

  return (
    <>
      <button
        className={styles.warningTag}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Click to see warnings"
      >
        <span className={styles.warningDot}>⚠</span>
        {allMessages.length} warning{allMessages.length !== 1 ? 's' : ''}
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="modal-title">Warnings</div>
            </div>
            <div className={styles.warningList}>
              {allMessages.map((msg, i) => (
                <div key={i} className={styles.warningItem}>⚠ {msg}</div>
              ))}
            </div>
            <button className="modal-cancel" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main QueueItem ───────────────────────────────────────────────────────────
export default function QueueItem({ item, instanceId, instanceType, onRemove, onRefresh }) {
  const [showImport, setShowImport] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  const progress = item.size > 0 ? ((item.size - (item.sizeleft || 0)) / item.size) * 100 : 0;
  const title = getTitle(item);
  const sem = getSemanticStatus(item);
  const hasError = sem === 'issue';
  const canImport = needsManualImport(item);
  const eta = formatEta(item.estimatedCompletionTime);
  const sizeStr = formatBytes(item.size);
  const quality = item.quality?.quality?.name;
  const cfScore = item.customFormatScore;

  const subtitle = getSubtitle(item);

  return (
    <>
      <div className={`${styles.item} ${hasError ? styles.hasError : ''}`}>
        <div className={styles.main}>
          {/* Row 1: title + episode code+name (same weight as title) + status + progress */}
          <div className={styles.titleRow}>
            <span className={styles.title} title={title}>{title}</span>
            {subtitle && <span className={styles.episode}>{subtitle}</span>}
            <div className={styles.titleRight}>
              {sem === 'downloading' && (
                <span className={`${styles.metaTag} ${styles.metaTagAccent}`}>{progress.toFixed(0)}%{eta ? ` · ${eta}` : ''}</span>
              )}
              <span className={`${statusChipClass(sem)} ${styles.statusChip}`}>{statusLabel(sem)}</span>
            </div>
          </div>

          {/* Row 2: release title (truncated, click for full) + meta tags */}
          <div className={styles.metaRow}>
            {(item.title || item.sourceTitle) && <ReleaseTitleTag title={item.title || item.sourceTitle} />}
            {quality && <span className={styles.metaTag}>{quality}</span>}
            {sizeStr && <span className={styles.metaTag}>{sizeStr}</span>}
            {cfScore != null && cfScore !== 0 && (
              <span className={`${styles.metaTag} ${cfScore > 0 ? styles.metaTagGreen : styles.metaTagRed}`}>
                CF {cfScore > 0 ? '+' : ''}{cfScore}
              </span>
            )}
            {hasError && item.statusMessages?.length > 0 && (
              <WarningTag messages={item.statusMessages} />
            )}
          </div>

          {/* Progress bar — only when downloading */}
          {sem === 'downloading' && (
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
          )}
        </div>

        {/* Inline action buttons */}
        <div className={styles.actions}>
          {canImport && (
            <>
              <button
                className={`${styles.actionBtn} ${styles.importBtn}`}
                onClick={() => setShowImport(true)}
                disabled={importBusy}
                title="Manual Import"
              >
                {importBusy ? <span className="spin"><ImportIcon /></span> : <ImportIcon />}
              </button>
              <div className={styles.actionDivider} />
            </>
          )}
          <button
            className={`${styles.actionBtn} ${styles.removeBtn}`}
            onClick={() => setShowRemove(true)}
            title="Remove"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {showImport && (
        <ManualImportModal
          item={item}
          instanceId={instanceId}
          instanceType={instanceType}
          onClose={() => setShowImport(false)}
          onDone={onRefresh}
        />
      )}
      {showRemove && (
        <RemoveModal
          item={item}
          onClose={() => setShowRemove(false)}
          onRemove={onRemove}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}

const ImportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
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
const BlockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);
