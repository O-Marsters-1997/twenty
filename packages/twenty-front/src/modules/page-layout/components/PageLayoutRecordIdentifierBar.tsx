import { RecordIdentifierBarCreatedAt } from '@/object-record/record-show/components/RecordIdentifierBarCreatedAt';
import { RecordIdentifierBarTitle } from '@/object-record/record-show/components/RecordIdentifierBarTitle';
import { useOpenPageLayoutTabSettings } from '@/page-layout/hooks/useOpenPageLayoutTabSettings';
import { type PageLayoutTab } from '@/page-layout/types/PageLayoutTab';
import { type TargetRecordIdentifier } from '@/ui/layout/contexts/TargetRecordIdentifier';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconPinned } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  background,
  borderColor,
} from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  bar: {
    alignItems: 'stretch',
    backgroundColor: background['--t-background-secondary'],
    boxShadow: `inset 0 -1px 0 ${borderColor['--t-border-color-light']}`,
    boxSizing: 'border-box',
    display: 'grid',
    height: '40px',
    width: '100%',
  },
  barWithPinnedTab: { gridTemplateColumns: '348px minmax(0, 1fr)' },
  barWithTabList: {
    gridTemplateColumns:
      'min(348px, calc(100% / 3)) minmax(0, 1fr) min(348px, calc(100% / 3))',
  },
  barDefault: { gridTemplateColumns: 'minmax(0, 1fr) auto' },
  identifierCell: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    paddingInlineEnd: spacing['--t-spacing-2'],
    paddingInlineStart: spacing['--t-spacing-3'],
    minWidth: 0,
  },
  identifierCellWithPinnedTab: {
    borderRightColor: borderColor['--t-border-color-medium'],
    borderRightStyle: 'solid',
    borderRightWidth: 1,
  },
  tabsCell: {
    alignItems: 'stretch',
    display: { default: 'flex', [media.print]: 'none' },
    minWidth: 0,
  },
  pinnedTab: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    height: '100%',
  },
  createdAtCell: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    minWidth: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-3'],
  },
});

type PageLayoutRecordIdentifierBarProps = {
  targetRecordIdentifier: TargetRecordIdentifier;
  pinnedTab?: Pick<PageLayoutTab, 'id' | 'title'>;
  isPinnedTabEditable?: boolean;
  tabList?: ReactNode;
};

export const PageLayoutRecordIdentifierBar = ({
  targetRecordIdentifier,
  pinnedTab,
  isPinnedTabEditable = false,
  tabList,
}: PageLayoutRecordIdentifierBarProps) => {
  const { t } = useLingui();
  const { openTabSettings } = useOpenPageLayoutTabSettings();
  const hasPinnedTab = isDefined(pinnedTab);
  const hasTabList = Boolean(tabList);
  const createdAt = (
    <RecordIdentifierBarCreatedAt objectRecordId={targetRecordIdentifier.id} />
  );

  return (
    <div
      {...stylex.props(
        styles.bar,
        hasPinnedTab
          ? styles.barWithPinnedTab
          : hasTabList
            ? styles.barWithTabList
            : styles.barDefault,
      )}
    >
      <div
        {...stylex.props(
          styles.identifierCell,
          hasPinnedTab && styles.identifierCellWithPinnedTab,
        )}
      >
        <RecordIdentifierBarTitle
          objectNameSingular={targetRecordIdentifier.targetObjectNameSingular}
          objectRecordId={targetRecordIdentifier.id}
        />

        {isPinnedTabEditable && isDefined(pinnedTab) && (
          <div {...stylex.props(styles.pinnedTab)}>
            <IconButton
              aria-label={t`Edit pinned tab: ${pinnedTab.title}`}
              onClick={() => openTabSettings(pinnedTab.id)}
              tooltip={t`Pinned tab, always shown on the left`}
              tooltipDelay={TooltipDelay.shortDelay}
              size="sm"
              variant="ghost"
            >
              <IconPinned />
            </IconButton>
          </div>
        )}
      </div>

      {(hasPinnedTab || hasTabList) && (
        <div {...stylex.props(styles.tabsCell)}>{tabList}</div>
      )}

      {!hasPinnedTab && (
        <div {...stylex.props(styles.createdAtCell)}>{createdAt}</div>
      )}
    </div>
  );
};
