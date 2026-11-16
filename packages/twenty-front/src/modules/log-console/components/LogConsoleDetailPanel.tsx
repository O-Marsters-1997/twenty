import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString, isString } from '@sniptt/guards';
import { formatInTimeZone } from 'date-fns-tz';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { JsonTree } from 'twenty-ui/components/data-display';
import { IconButton, LightButton } from 'twenty-ui/components/input';
import { Section } from 'twenty-ui/components/layout';
import {
  IconCopy,
  IconId,
  IconLayoutSidebarRightCollapse,
} from 'twenty-ui/icon';
import { Card } from 'twenty-ui/primitives/surfaces';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';

import { allowRequestsToTwentyIconsState } from '@/client-config/states/allowRequestsToTwentyIcons';
import { TimeFormat } from '@/localization/constants/TimeFormat';
import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { StyledLogConsoleFieldsCard } from '@/log-console/components/StyledLogConsoleFieldsCard';
import { logConsoleQueries } from './LogConsole.stylex';
import { useLogConsoleTimeZone } from '@/log-console/hooks/useLogConsoleTimeZone';
import { logConsoleSelectedLogState } from '@/log-console/states/logConsoleSelectedLogState';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { objectMetadataItemsByIdMapSelector } from '@/object-metadata/states/objectMetadataItemsByIdMapSelector';
import { getObjectRecordIdentifier } from '@/object-metadata/utils/getObjectRecordIdentifier';
import { FieldWidgetShowMoreButton } from '@/page-layout/widgets/field/components/FieldWidgetShowMoreButton';
import { LogConsoleFieldRow } from '@/log-console/components/LogConsoleFieldRow';
import { APP_HEADER_HEIGHT } from '@/ui/layout/constants/AppHeaderHeight';
import { HeaderIdentifier } from '@/ui/layout/page/components/HeaderIdentifier';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type EventLogRecord } from '~/generated-metadata/graphql';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  general,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const COLLAPSED_MESSAGE_STACK_LINE_COUNT = 1;

const styles = stylex.create({
  panel: {
    borderLeftColor: borderColor['--t-border-color-medium'],
    borderLeftStyle: 'solid',
    borderLeftWidth: {
      default: 1,
      [logConsoleQueries.narrowBody]: 0,
    },
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    inset: {
      default: null,
      [logConsoleQueries.narrowBody]: 0,
    },
    position: {
      default: null,
      [logConsoleQueries.narrowBody]: 'absolute',
    },
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    gap: general['--t-between-siblings-gap'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
  },
  topBarHeight: (height: number) => ({ height }),
  messageCard: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-1'],
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-3'],
  },
  content: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-6'],
    minHeight: '0',
    overflowY: 'auto',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  messageFirstLine: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    overflowWrap: 'anywhere',
  },
  messageStackLine: {
    color: fontColor['--t-font-color-tertiary'],
  },
  copyableId: {
    cursor: 'pointer',
    minWidth: '0',
  },
  rawEvent: {
    overflowX: 'auto',
  },
});

export const LogConsoleDetailPanel = () => {
  const { t } = useLingui();
  const theme = useTheme();
  const { copyToClipboard } = useCopyToClipboard();
  const timeZone = useLogConsoleTimeZone();
  const { dateFormat, timeFormat } = useDateTimeFormat();
  const { localeCatalog } = useAtomStateValue(dateLocaleState);
  const [logConsoleSelectedLog, setLogConsoleSelectedLog] = useAtomState(
    logConsoleSelectedLogState,
  );
  const objectMetadataItemsByIdMap = useAtomStateValue(
    objectMetadataItemsByIdMapSelector,
  );
  const allowRequestsToTwentyIcons = useAtomStateValue(
    allowRequestsToTwentyIconsState,
  );
  const [entryWithExpandedMessage, setEntryWithExpandedMessage] =
    useState<EventLogRecord>();

  if (!isDefined(logConsoleSelectedLog)) {
    return null;
  }

  const { source, entry } = logConsoleSelectedLog;
  const { __typename, ...rawEvent } = entry;
  const rawMessage = entry.properties?.message ?? entry.properties?.error;
  const message: string | undefined = isString(rawMessage)
    ? rawMessage
    : undefined;
  const objectMetadataItem = objectMetadataItemsByIdMap.get(
    entry.objectMetadataId ?? '',
  );
  const recordSnapshot = entry.properties?.after ?? entry.properties?.before;

  const recordIdentifier =
    isDefined(objectMetadataItem) && isDefined(recordSnapshot)
      ? getObjectRecordIdentifier({
          objectMetadataItem,
          record: recordSnapshot,
          allowRequestsToTwentyIcons,
        })
      : undefined;

  const DetailIcon = source.DetailIcon ?? source.Icon;

  const title = isDefined(recordIdentifier)
    ? recordIdentifier.name
    : source.getDetailTitle(entry, { objectMetadataItem });

  const timeWithMillisecondsFormat =
    timeFormat === TimeFormat.HOUR_12 ? 'h:mm:ss.SSS aa' : 'HH:mm:ss.SSS';

  const formattedTimestamp = formatInTimeZone(
    entry.timestamp,
    timeZone,
    `${timeWithMillisecondsFormat} · ${dateFormat}`,
    { locale: localeCatalog },
  );

  const [firstMessageLine, ...messageStackLines] = (message ?? '').split('\n');

  const displayedMessageStackLines =
    entryWithExpandedMessage === entry
      ? messageStackLines
      : messageStackLines.slice(0, COLLAPSED_MESSAGE_STACK_LINE_COUNT);

  const hiddenMessageStackLineCount =
    messageStackLines.length - displayedMessageStackLines.length;

  const detailItems = [
    ...source.detailFields.flatMap(({ label, Icon, renderValue }) => {
      const value = renderValue(entry, {
        formattedTimestamp,
        objectMetadataItem,
      });

      return isDefined(value) ? [{ Icon, label: t(label), value }] : [];
    }),
    ...source.idFields.flatMap(({ label, Icon = IconId, getId }) => {
      const id = getId(entry);

      return isNonEmptyString(id)
        ? [
            {
              Icon,
              label: t(label),
              value: (
                <div
                  onClick={() => copyToClipboard(id)}
                  {...stylex.props(styles.copyableId)}
                >
                  <OverflowingTextWithTooltip
                    text={<>{id}</>}
                    tooltipContent={id}
                  />
                </div>
              ),
            },
          ]
        : [];
    }),
  ];

  const closeLabel = t`Close details`;

  return (
    <aside {...stylex.props(styles.panel)}>
      <div
        {...stylex.props(styles.topBar, styles.topBarHeight(APP_HEADER_HEIGHT))}
      >
        <IconButton
          size="sm"
          variant="ghost"
          tooltip={closeLabel}
          aria-label={closeLabel}
          onClick={() => setLogConsoleSelectedLog(null)}
        >
          <IconLayoutSidebarRightCollapse />
        </IconButton>
        <HeaderIdentifier
          avatar={
            isDefined(recordIdentifier)
              ? {
                  src: getAbsoluteImageUrl(recordIdentifier.avatarUrl ?? ''),
                  name: recordIdentifier.name,
                  colorSeed: recordIdentifier.id,
                  shape: recordIdentifier.avatarShape ?? undefined,
                }
              : undefined
          }
          icon={
            isDefined(entry.objectMetadataId) ? (
              <ObjectMetadataIcon
                objectMetadataItem={objectMetadataItem}
                size={theme.icon.size.md}
                stroke={theme.icon.stroke.sm}
              />
            ) : (
              <DetailIcon
                size={theme.icon.size.md}
                stroke={theme.icon.stroke.sm}
              />
            )
          }
          iconColor={themeCssVariables.font.color.tertiary}
          title={isNonEmptyString(title) ? title : t`Untitled`}
        />
      </div>
      <div {...stylex.props(styles.content)}>
        {isNonEmptyString(message) && (
          <Section.Root>
            <Section.Header
              title={t`Message`}
              actions={
                <LightButton
                  startIcon={<IconCopy />}
                  onClick={() => copyToClipboard(message)}
                >
                  {t`Copy`}
                </LightButton>
              }
            />
            <Card.Root
              backgroundColor={themeCssVariables.background.secondary}
              xstyle={styles.messageCard}
            >
              <div {...stylex.props(styles.messageFirstLine)}>
                {firstMessageLine}
              </div>
              {displayedMessageStackLines.map((messageStackLine, index) => (
                <div key={index} {...stylex.props(styles.messageStackLine)}>
                  <OverflowingTextWithTooltip text={messageStackLine.trim()} />
                </div>
              ))}
              {hiddenMessageStackLineCount > 0 && (
                <FieldWidgetShowMoreButton
                  remainingCount={hiddenMessageStackLineCount}
                  onClick={() => setEntryWithExpandedMessage(entry)}
                />
              )}
            </Card.Root>
          </Section.Root>
        )}
        {source.renderDetailContent?.(entry)}
        <Section.Root>
          <Section.Header title={t`Details`} />
          <StyledLogConsoleFieldsCard>
            {detailItems.map(({ Icon, label, value }) => (
              <LogConsoleFieldRow key={label} Icon={Icon} label={label}>
                {value}
              </LogConsoleFieldRow>
            ))}
          </StyledLogConsoleFieldsCard>
        </Section.Root>
        <Section.Root>
          <Section.Header
            title={t`Raw event`}
            actions={
              <LightButton
                startIcon={<IconCopy />}
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(rawEvent, null, 2),
                    t`Log copied as JSON`,
                  )
                }
              >
                {t`Copy as JSON`}
              </LightButton>
            }
          />
          <div {...stylex.props(styles.rawEvent)}>
            <JsonTree
              value={rawEvent}
              emptyArrayLabel={t`Empty Array`}
              emptyObjectLabel={t`Empty Object`}
              emptyStringLabel={t`[empty string]`}
              arrowButtonCollapsedLabel={t`Expand`}
              arrowButtonExpandedLabel={t`Collapse`}
              onNodeValueClick={copyToClipboard}
            />
          </div>
        </Section.Root>
      </div>
    </aside>
  );
};
