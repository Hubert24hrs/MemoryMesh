// src/database/models/SyncQueueModel.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, json, readonly } from '@nozbe/watermelondb/decorators';

const sanitizeObject = (raw: any): Record<string, any> => (typeof raw === 'object' && raw !== null ? raw : {});

export class SyncQueueModel extends Model {
  static override table = 'sync_queue';

  @field('table_name') tableName!: string;
  @field('record_id') recordId!: string;
  @field('operation') operation!: 'create' | 'update' | 'delete';
  
  @json('payload_json', sanitizeObject) payload!: Record<string, any>;

  @field('retry_count') retryCount!: number;
  @readonly @date('created_at') createdAt!: Date;
}
export default SyncQueueModel;
