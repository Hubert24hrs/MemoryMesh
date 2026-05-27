// src/database/models/MemoryModel.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, json, readonly } from '@nozbe/watermelondb/decorators';

const sanitizeArray = (raw: any): string[] => (Array.isArray(raw) ? raw : []);

export class MemoryModel extends Model {
  static override table = 'memories';

  @field('remote_id') remoteId!: string | null;
  @field('content') content!: string;
  @field('summary') summary!: string;
  @field('type') type!: string;
  @field('category') category!: string;
  
  @json('tags_json', sanitizeArray) tags!: string[];
  @json('key_points_json', sanitizeArray) keyPoints!: string[];

  @field('ai_provider') aiProvider!: string;
  @field('sentiment') sentiment!: string | null;
  @field('importance') importance!: number;
  @field('audio_url') audioUrl!: string | null;
  @field('image_url') imageUrl!: string | null;
  @field('is_encrypted') isEncrypted!: boolean;
  @field('is_deleted') isDeleted!: boolean;
  @field('is_synced') isSynced!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
export default MemoryModel;
