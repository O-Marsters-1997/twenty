import { msg } from '@lingui/core/macro';

import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import {
  PageLayoutTabLayoutMode,
  PageLayoutType,
  WidgetType,
} from 'twenty-shared/types';

import {
  TAB_PROPS,
  VERTICAL_LIST_LAYOUT_POSITIONS,
  WIDGET_PROPS,
} from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout-tabs.template';
import {
  type StandardPageLayoutConfig,
  type StandardPageLayoutTabConfig,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-page-layout-config.type';
import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';

const CALENDAR_EVENT_PAGE_TABS = {
  home: {
    universalIdentifier:
      STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.calendarEventRecordPage.tabs
        .home.universalIdentifier,
    ...TAB_PROPS.home,
    widgets: {
      fields: {
        universalIdentifier:
          STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.calendarEventRecordPage
            .tabs.home.widgets.fields.universalIdentifier,
        ...WIDGET_PROPS.fields,
      },
      participants: {
        universalIdentifier:
          STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.calendarEventRecordPage
            .tabs.home.widgets.participants.universalIdentifier,
        title: 'Participants',
        type: WidgetType.FIELD,
        position: VERTICAL_LIST_LAYOUT_POSITIONS.SECOND,
        fieldUniversalIdentifier:
          STANDARD_OBJECTS.calendarEvent.fields.calendarEventParticipants
            .universalIdentifier,
      },
    },
  },
  timeline: {
    universalIdentifier:
      STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.calendarEventRecordPage.tabs
        .timeline.universalIdentifier,
    ...TAB_PROPS.timeline,
    widgets: {
      timeline: {
        universalIdentifier:
          STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.calendarEventRecordPage
            .tabs.timeline.widgets.timeline.universalIdentifier,
        ...WIDGET_PROPS.timeline,
      },
    },
  },
} as const satisfies Record<string, StandardPageLayoutTabConfig>;

export const STANDARD_CALENDAR_EVENT_PAGE_LAYOUT_CONFIG = {
  name: 'Default Calendar Event Layout',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: STANDARD_OBJECTS.calendarEvent.universalIdentifier,
  universalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.calendarEventRecordPage
      .universalIdentifier,
  defaultTabUniversalIdentifier: null,
  tabs: CALENDAR_EVENT_PAGE_TABS,
} as const satisfies StandardPageLayoutConfig;
