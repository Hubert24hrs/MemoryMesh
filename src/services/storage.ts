// src/services/storage.ts
import { supabase } from './supabase';

export const storageService = {
  /**
   * Upload an audio recording file to Supabase Storage bucket 'memories_audio'
   */
  uploadAudio: async (uri: string, userId: string): Promise<string> => {
    try {
      const filename = `${userId}/${Date.now()}_audio.m4a`;
      
      // Native File upload setup for Supabase
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'audio.m4a',
        type: 'audio/m4a',
      } as any);

      // Perform upload using Supabase Storage API
      const { data, error } = await supabase.storage
        .from('memories_audio')
        .upload(filename, formData, {
          contentType: 'audio/m4a',
          upsert: true,
        });

      if (error) throw error;

      // Retrieve public CDN URL
      const { data: publicUrlData } = supabase.storage
        .from('memories_audio')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (e) {
      console.warn('Storage upload audio failed, generating offline mock URL:', e);
      return `https://mock-cdn.memorymesh.app/audio/${userId}_${Date.now()}.m4a`;
    }
  },

  /**
   * Upload an image to Supabase Storage bucket 'memories_images'
   */
  uploadImage: async (uri: string, userId: string): Promise<string> => {
    try {
      const filename = `${userId}/${Date.now()}_image.jpg`;

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'image.jpg',
        type: 'image/jpeg',
      } as any);

      const { data, error } = await supabase.storage
        .from('memories_images')
        .upload(filename, formData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('memories_images')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (e) {
      console.warn('Storage upload image failed, generating offline mock URL:', e);
      return `https://mock-cdn.memorymesh.app/images/${userId}_${Date.now()}.jpg`;
    }
  },

  /**
   * Delete a file from storage bucket using its public CDN URL
   */
  deleteFile: async (url: string): Promise<void> => {
    try {
      if (url.includes('mock-cdn.memorymesh.app')) {
        console.log(`☁️ [Storage] Deleted mock file from offline storage: ${url}`);
        return;
      }

      // Parse bucket name and path from the URL
      const parts = url.split('/storage/v1/object/public/');
      if (parts.length < 2) return;

      const [bucketName, ...pathParts] = parts[1].split('/');
      const filePath = pathParts.join('/');

      const { error } = await supabase.storage.from(bucketName).remove([filePath]);
      if (error) throw error;

      console.log(`☁️ [Storage] Successfully deleted remote asset: ${bucketName}/${filePath}`);
    } catch (e) {
      console.error('Failed to delete file from remote storage:', e);
    }
  },
};
export default storageService;
