import { t } from '@lingui/core/macro';
import React, { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { type IconComponent } from 'twenty-ui/icon';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';

import { type CommandMenuItemSectionContext } from '@/command-menu-item/types/CommandMenuItemSectionContext';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  heading: {
    alignItems: 'center',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-medium'],
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    height: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-1'],
    userSelect: 'none',
  },
  headingIcon: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'center',
    width: spacing['--t-spacing-6'],
  },
  headingText: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    minWidth: '0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    marginTop: {
      default: spacing['--t-spacing-3'],
      ':first-child': 0,
    },
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-0_5'],
  },
});

type CommandMenuItemSectionGroupProps = {
  heading: string;
  Icon?: IconComponent;
  context?: CommandMenuItemSectionContext;
  children: ReactNode;
};

export const CommandMenuItemSectionGroup = ({
  heading,
  Icon,
  context,
  children,
}: CommandMenuItemSectionGroupProps) => {
  const theme = useTheme();

  if (!isDefined(children) || !React.Children.count(children)) {
    return null;
  }

  const contextLabel = context?.label;

  return (
    <div {...stylex.props(styles.section)}>
      <div {...stylex.props(styles.heading)}>
        {isDefined(context?.icon) ? (
          <span {...stylex.props(styles.headingIcon)}>{context.icon}</span>
        ) : (
          isDefined(Icon) && (
            <span {...stylex.props(styles.headingIcon)}>
              <Icon size={theme.icon.size.md} />
            </span>
          )
        )}
        <span {...stylex.props(styles.headingText)}>
          <OverflowingTextWithTooltip
            text={
              isDefined(contextLabel) ? t`${heading}: ${contextLabel}` : heading
            }
          />
        </span>
      </div>
      <div {...stylex.props(styles.group)}>{children}</div>
    </div>
  );
};
