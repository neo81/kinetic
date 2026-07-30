import type { AppRelease } from '../../app/releaseNotes';
import { supabase } from '../../lib/supabase/client';

type ReleaseState = {
  releases: AppRelease[];
  unreadReleases: AppRelease[];
};

export const releaseNotesRepository = {
  async getReleaseState(userId: string): Promise<ReleaseState> {
    if (!supabase) {
      throw new Error('Supabase no esta configurado.');
    }

    const [releasesResult, readsResult] = await Promise.all([
      supabase
        .from('app_releases')
        .select(`
          version,
          title,
          published_at,
          app_release_notes (
            position,
            title,
            description
          )
        `)
        .eq('is_published', true)
        .order('published_at', { ascending: false }),
      supabase
        .from('user_release_reads')
        .select('release_version')
        .eq('user_id', userId),
    ]);

    if (releasesResult.error) throw releasesResult.error;
    if (readsResult.error) throw readsResult.error;

    const releases: AppRelease[] = (releasesResult.data ?? []).map((release) => ({
      version: release.version,
      title: release.title,
      publishedAt: release.published_at,
      notes: [...(release.app_release_notes ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((note) => ({
          title: note.title,
          description: note.description,
        })),
    }));

    const readVersions = new Set((readsResult.data ?? []).map((read) => read.release_version));

    return {
      releases,
      unreadReleases: releases.filter((release) => !readVersions.has(release.version)),
    };
  },

  async markReleasesRead(userId: string, versions: string[]): Promise<void> {
    if (!supabase || versions.length === 0) return;

    const { error } = await supabase
      .from('user_release_reads')
      .insert(
        versions.map((releaseVersion) => ({
          user_id: userId,
          release_version: releaseVersion,
        })),
      );

    if (error) throw error;
  },
};
