import { styled } from '@linaria/react';
import { type MouseEventHandler, type ReactNode } from 'react';

import { ComposerFieldRow } from '@/activities/components/ComposerFieldRow';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor, borderRadius, spacing } from 'twenty-ui/theme/tokens.stylex';

// Widest campaign row label ("Unsubscribe topic"), so every value starts on the same column.
const CAMPAIGN_ENVELOPE_LABEL_MIN_WIDTH = '116px';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: '0',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: '0',
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: '0',
    width: '100%',
  },
  rows: {
    backgroundColor: background['--t-background-secondary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    width: '100%',
  },
});

const StyledColumn = styled.div<{ $width: string }>`
  display: flex;
  flex-direction: column;
  max-width: ${({ $width }) => $width};
  min-width: 0;
  width: 100%;
`;

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
    <StyledColumn $width={width}>
      <div {...stylex.props(styles.rows)}>{children}</div>
      {below}
    </StyledColumn>
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
