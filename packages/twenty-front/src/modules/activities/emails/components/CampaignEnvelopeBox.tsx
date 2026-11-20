import { type MouseEventHandler, type ReactNode } from 'react';

import { ComposerFieldRow } from '@/activities/components/ComposerFieldRow';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

// Widest campaign row label ("Unsubscribe topic"), so every value starts on the same column.
const CAMPAIGN_ENVELOPE_LABEL_MIN_WIDTH = '116px';

const styles = stylex.create({
  container: {
    paddingBlock: spacing['--t-spacing-3'],
    paddingInline: '0',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: '0',
    width: '100%',
  },
  rows: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    overflow: 'hidden',
    backgroundColor: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    width: '100%',
  },
  columnMaxWidth: (maxWidth: string) => ({ maxWidth }),
});

type CampaignEnvelopeBoxProps = {
  width: string;
  children: ReactNode;
  below?: ReactNode;
  onBlur?: () => void;
};

export const CampaignEnvelopeBox = ({
  width,
  children,
  below,
  onBlur,
}: CampaignEnvelopeBoxProps) => (
  <div onBlur={onBlur} {...stylex.props(styles.container)}>
    <div {...stylex.props(styles.column, styles.columnMaxWidth(width))}>
      <div {...stylex.props(styles.rows)}>{children}</div>
      {below}
    </div>
  </div>
);

type CampaignEnvelopeRowProps = {
  label: string;
  children: ReactNode;
  trailing?: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
};

export const CampaignEnvelopeRow = ({
  label,
  children,
  trailing,
  onClick,
}: CampaignEnvelopeRowProps) => (
  <ComposerFieldRow
    label={label}
    trailing={trailing}
    onClick={onClick}
    labelMinWidth={CAMPAIGN_ENVELOPE_LABEL_MIN_WIDTH}
  >
    {children}
  </ComposerFieldRow>
);
