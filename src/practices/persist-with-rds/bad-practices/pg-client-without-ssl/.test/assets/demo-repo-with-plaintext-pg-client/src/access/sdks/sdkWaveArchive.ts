import pg from 'pg';

/**
 * .what = a client for a wave archive outside the app config
 */
export const getWaveArchiveClient = () =>
  new pg.Client({ host: process.env.WAVE_ARCHIVE_HOST });
