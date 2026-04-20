const t = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

export const MOCK_INSTANCES = [
  { id: 'mock-sonarr', name: 'Sonarr',  type: 'sonarr',  enabled: true, url: '#', external_url: null },
  { id: 'mock-radarr', name: 'Radarr',  type: 'radarr',  enabled: true, url: '#', external_url: null },
  { id: 'mock-lidarr', name: 'Lidarr',  type: 'lidarr',  enabled: true, url: '#', external_url: null },
];

const sonarr = MOCK_INSTANCES[0];
const radarr  = MOCK_INSTANCES[1];
const lidarr  = MOCK_INSTANCES[2];

export const MOCK_ITEMS = [
  {
    id: 'mock-1',
    status: 'downloading', trackedDownloadStatus: 'ok', trackedDownloadState: 'downloading',
    series: { id: 1, title: 'The Bear' },
    episode: { seasonNumber: 3, episodeNumber: 2, title: 'Pasta' },
    title: 'The.Bear.S03E02.1080p.BluRay.x265-FLUX',
    sourceTitle: 'The.Bear.S03E02.1080p.BluRay.x265-FLUX',
    quality: { quality: { name: '1080p BluRay' } },
    size: 4831838208, sizeleft: 1207959552,
    estimatedCompletionTime: t(8 * 60 * 1000),
    customFormatScore: 120,
    downloadId: 'mock-dl-1',
    _instance: sonarr,
  },
  {
    id: 'mock-2',
    status: 'downloading', trackedDownloadStatus: 'ok', trackedDownloadState: 'downloading',
    movie: { id: 2, title: 'Dune: Part Two' },
    title: 'Dune.Part.Two.2024.2160p.UHD.BluRay.x265.HDR.DTS-HD-GROUP',
    sourceTitle: 'Dune.Part.Two.2024.2160p.UHD.BluRay.x265.HDR.DTS-HD-GROUP',
    quality: { quality: { name: '2160p BluRay' } },
    size: 53687091200, sizeleft: 32212254720,
    estimatedCompletionTime: t(47 * 60 * 1000),
    customFormatScore: 250,
    downloadId: 'mock-dl-2',
    _instance: radarr,
  },
  {
    id: 'mock-3',
    status: 'completed', trackedDownloadStatus: 'ok', trackedDownloadState: 'importing',
    series: { id: 3, title: 'Severance' },
    episode: { seasonNumber: 2, episodeNumber: 9, title: 'The We We Are' },
    title: 'Severance.S02E09.2160p.WEB-DL.x265.HDR-NTb',
    sourceTitle: 'Severance.S02E09.2160p.WEB-DL.x265.HDR-NTb',
    quality: { quality: { name: '2160p WEB-DL' } },
    size: 7516192768, sizeleft: 0,
    customFormatScore: 200,
    downloadId: 'mock-dl-3',
    _instance: sonarr,
  },
  {
    id: 'mock-4',
    status: 'completed', trackedDownloadStatus: 'ok', trackedDownloadState: 'importPending',
    movie: { id: 4, title: 'Anora' },
    title: 'Anora.2024.1080p.BluRay.DDP5.1.x264-KNiVES',
    sourceTitle: 'Anora.2024.1080p.BluRay.DDP5.1.x264-KNiVES',
    quality: { quality: { name: '1080p BluRay' } },
    size: 9663676416, sizeleft: 0,
    customFormatScore: 80,
    downloadId: 'mock-dl-4',
    _instance: radarr,
  },
  {
    id: 'mock-5',
    status: 'paused', trackedDownloadStatus: 'ok', trackedDownloadState: 'downloading',
    series: { id: 5, title: 'White Lotus' },
    episode: { seasonNumber: 3, episodeNumber: 1, title: 'Same Monkey' },
    title: 'The.White.Lotus.S03E01.1080p.WEB-DL.H264-GGEZ',
    sourceTitle: 'The.White.Lotus.S03E01.1080p.WEB-DL.H264-GGEZ',
    quality: { quality: { name: '1080p WEB-DL' } },
    size: 3145728000, sizeleft: 3145728000,
    customFormatScore: 0,
    downloadId: 'mock-dl-5',
    _instance: sonarr,
  },
  {
    id: 'mock-6',
    status: 'warning', trackedDownloadStatus: 'warning', trackedDownloadState: 'importPending',
    series: { id: 6, title: 'Andor' },
    episode: { seasonNumber: 2, episodeNumber: 5, title: 'Ion Cloud' },
    title: 'Andor.S02E05.2160p.WEB-DL.x265.HDR-FLUX',
    sourceTitle: 'Andor.S02E05.2160p.WEB-DL.x265.HDR-FLUX',
    quality: { quality: { name: '2160p WEB-DL' } },
    size: 8053063680, sizeleft: 0,
    customFormatScore: 180,
    downloadId: 'mock-dl-6',
    statusMessages: [
      { title: 'No files found are eligible for import in /downloads/Andor.S02E05.2160p.WEB-DL.x265.HDR-FLUX', messages: [] },
      { title: 'Andor.S02E05.2160p.WEB-DL.x265.HDR-FLUX', messages: ['No video files found in the download folder'] },
    ],
    _instance: sonarr,
  },
  {
    id: 'mock-7',
    status: 'failed', trackedDownloadStatus: 'error', trackedDownloadState: 'failedPending',
    movie: { id: 7, title: 'The Brutalist' },
    title: 'The.Brutalist.2024.1080p.BluRay.x264-SCENE',
    sourceTitle: 'The.Brutalist.2024.1080p.BluRay.x264-SCENE',
    quality: { quality: { name: '1080p BluRay' } },
    size: 14495514624, sizeleft: 14495514624,
    customFormatScore: -40,
    downloadId: 'mock-dl-7',
    statusMessages: [
      { title: 'The download failed', messages: ['Download client returned error: Could not connect to tracker'] },
    ],
    _instance: radarr,
  },
  {
    id: 'mock-8',
    status: 'queued', trackedDownloadStatus: 'ok', trackedDownloadState: null,
    movie: { id: 8, title: 'Conclave' },
    title: 'Conclave.2024.1080p.WEB-DL.DDP5.1.x264-NTb',
    sourceTitle: 'Conclave.2024.1080p.WEB-DL.DDP5.1.x264-NTb',
    quality: { quality: { name: '1080p WEB-DL' } },
    size: 7000000000, sizeleft: 7000000000,
    customFormatScore: 60,
    downloadId: 'mock-dl-8',
    _instance: radarr,
  },
  {
    id: 'mock-9',
    status: 'queued', trackedDownloadStatus: 'ok', trackedDownloadState: null,
    artist: { id: 9, artistName: 'Mk.gee' },
    album: { id: 9, title: 'Two Star & The Dream Police' },
    title: 'Mk.gee-Two.Star.And.The.Dream.Police-2024-FLAC',
    sourceTitle: 'Mk.gee-Two.Star.And.The.Dream.Police-2024-FLAC',
    quality: { quality: { name: 'FLAC' } },
    size: 524288000, sizeleft: 524288000,
    customFormatScore: 0,
    downloadId: 'mock-dl-9',
    _instance: lidarr,
  },
];

export const MOCK_GLOBAL_ITEMS = MOCK_ITEMS;

export function mockQueueForInstance(instanceId) {
  const inst = MOCK_INSTANCES.find(i => i.id === instanceId);
  if (!inst) return MOCK_ITEMS;
  return MOCK_ITEMS.filter(item => item._instance === inst);
}
