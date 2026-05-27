// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'memories',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true },
        { name: 'content', type: 'string' },
        { name: 'summary', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'tags_json', type: 'string' },
        { name: 'key_points_json', type: 'string' },
        { name: 'ai_provider', type: 'string' },
        { name: 'sentiment', type: 'string', isOptional: true },
        { name: 'importance', type: 'number' },
        { name: 'audio_url', type: 'string', isOptional: true },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'is_encrypted', type: 'boolean' },
        { name: 'is_deleted', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'table_name', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'operation', type: 'string' }, // 'create' | 'update' | 'delete'
        { name: 'payload_json', type: 'string' },
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
export default schema;
