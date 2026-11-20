import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { Fragment } from 'react/jsx-runtime';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

import { type SidePanelNavigationStackItem } from '@/side-panel/states/sidePanelNavigationStackState';

const styles = stylex.create({
  chip: {
    all: 'unset',
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-1'],
    paddingBlock: '0',
    paddingInline: spacing['--t-spacing-1'],
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    cursor: 'default',
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: 'center',
    lineHeight: textLineHeight['--t-text-line-height-lg'],
    height: spacing['--t-spacing-6'],
  },
  chipWithText: {
    paddingInline: spacing['--t-spacing-2'],
  },
  chipClickable: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      ':hover': backgroundTransparent['--t-background-transparent-medium'],
    },
    cursor: 'pointer',
  },
  chipMaxWidth: (maxWidth: string) => ({
    maxWidth,
  }),
  iconsContainer: {
    alignItems: 'center',
    display: 'flex',
  },
  emptyText: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

export type SidePanelContextChipProps = {
  Icons: React.ReactNode[];
  text?: string;
  onClick?: () => void;
  testId?: string;
  maxWidth?: string;
  forceEmptyText?: boolean;
  page?: SidePanelNavigationStackItem;
};

export const SidePanelContextChip = ({
  Icons,
  text,
  onClick,
  testId,
  maxWidth,
  forceEmptyText = false,
}: SidePanelContextChipProps) => {
  return (
    <button
      {...stylex.props(
        styles.chip,
        isNonEmptyString(text) && styles.chipWithText,
        isDefined(onClick) && styles.chipClickable,
        isDefined(maxWidth) && styles.chipMaxWidth(maxWidth),
      )}
      onClick={onClick}
      data-testid={testId}
    >
      <div {...stylex.props(styles.iconsContainer)}>
        {Icons.map((Icon, index) => (
          <Fragment key={index}>{Icon}</Fragment>
        ))}
      </div>
      {text?.trim?.() ? (
        <OverflowingTextWithTooltip text={text} />
      ) : !forceEmptyText ? (
        <div {...stylex.props(styles.emptyText)}>{t`Untitled`}</div>
      ) : (
        ''
      )}
    </button>
  );
};
