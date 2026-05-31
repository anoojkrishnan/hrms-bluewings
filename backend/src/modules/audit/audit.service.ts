import { AuditRepository } from './audit.repository';
import type { AuditLogEntry, CreateAuditLogDto } from './audit.types';
import type { PaginatedResult, PaginationQuery } from '@/shared/types/common';
import { logger } from '@/config/logger';

export class AuditService {
  private readonly repo: AuditRepository;

  constructor(repo?: AuditRepository) {
    this.repo = repo ?? new AuditRepository();
  }

  writeAsync(dto: CreateAuditLogDto): void {
    setImmediate(async () => {
      try {
        const entry: AuditLogEntry = {
          tenantId: dto.tenantId,
          organizationId: dto.organizationId,
          actorId: dto.actorId,
          actorType: dto.actorType ?? 'user',
          action: dto.action,
          module: dto.module,
          entityType: dto.entityType,
          entityPublicId: dto.entityPublicId,
          oldValue: dto.oldValue,
          newValue: dto.newValue,
          ipAddress: dto.ipAddress ?? '',
          userAgent: dto.userAgent ?? '',
          requestId: dto.requestId ?? '',
          timestamp: new Date(),
        };
        await this.repo.create(entry);
      } catch (err) {
        logger.error({ err, dto }, 'Audit write failed');
      }
    });
  }

  async findByTenant(
    tenantId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResult<AuditLogEntry>> {
    return this.repo.findByTenant(tenantId, query);
  }

  async findByEntity(tenantId: string, entityPublicId: string): Promise<AuditLogEntry[]> {
    return this.repo.findByEntity(tenantId, entityPublicId);
  }
}

export const auditService = new AuditService();
