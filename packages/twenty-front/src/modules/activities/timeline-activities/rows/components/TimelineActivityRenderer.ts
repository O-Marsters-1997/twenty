import { type ComponentType } from 'react';

import { type TimelineActivity } from '@/activities/timeline-activities/types/TimelineActivity';

export type StandardTimelineActivityRendererProps = {
  event: TimelineActivity;
  authorFullName: string;
};

export type TimelineActivityRenderer =
  ComponentType<StandardTimelineActivityRendererProps>;
