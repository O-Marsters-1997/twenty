/* @license Enterprise */

import { Injectable } from '@nestjs/common';

import { getEventLogRetentionInHours } from 'twenty-shared/utils';

@Injectable()
export class EventLogRetentionService {
  async getRetentionInHours({
    workspaceId,
    workspaceRetentionInDays,
  }: {
    workspaceId: string;
    workspaceRetentionInDays: number;
  }): Promise<number> {
    return getEventLogRetentionInHours({
      workspaceRetentionInDays,
      hasAuditLogsEntitlement: true,
    });
  }

  async getRetentionStartDate({
    workspaceId,
    workspaceRetentionInDays,
  }: {
    workspaceId: string;
    workspaceRetentionInDays: number;
  }): Promise<Date> {
    const retentionInHours = await this.getRetentionInHours({
      workspaceId,
      workspaceRetentionInDays,
    });

    return new Date(Date.now() - retentionInHours * 60 * 60 * 1000);
  }

}
