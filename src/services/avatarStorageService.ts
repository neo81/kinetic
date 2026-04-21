import { supabase } from '../lib/supabase/client';

export const avatarStorageService = {
  /**
   * Uploads an avatar image to Supabase Storage
   * @param userId The user ID
   * @param file The image file to upload
   * @returns The public URL of the uploaded image
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `avatar-${userId}-${timestamp}`;
    const filepath = `avatars/${userId}/${filename}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filepath, file, {
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      throw new Error(`Failed to upload avatar: ${uploadError.message}`);
    }

    // Get public URL
    const { data } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filepath);

    if (!data?.publicUrl) {
      throw new Error('Failed to get public URL for avatar');
    }

    return data.publicUrl;
  },

  /**
   * Deletes an old avatar from storage
   * @param userId The user ID
   * @param avatarUrl The public URL of the avatar to delete
   */
  async deleteOldAvatar(userId: string, avatarUrl: string): Promise<void> {
    if (!supabase || !avatarUrl) return;

    try {
      // Extract path from URL
      const urlParts = avatarUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const filepath = `avatars/${userId}/${filename}`;

      await supabase.storage
        .from('user-avatars')
        .remove([filepath]);
    } catch (error) {
      console.error('Error deleting old avatar:', error);
      // Don't throw - we don't want to break the flow if old avatar can't be deleted
    }
  },
};
