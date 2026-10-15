import { db, AuditLogRecord } from '../../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  public static log(params: {
    actorId?: string;
    actorRole?: string;
    action: string;
    entityType: string;
    entityId: string;
    details: any;
    ipAddress?: string;
  }): AuditLogRecord {
    const record: AuditLogRecord = {
      id: `audit-${uuidv4().substring(0, 8)}`,
      actor_id: params.actorId,
      actor_role: params.actorRole,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      details: params.details,
      ip_address: params.ipAddress || '127.0.0.1',
      timestamp: new Date().toISOString()
    };

    db.audit_logs.unshift(record); // Prepend so newest is first
    db.persist();

    return record;
  }
}
