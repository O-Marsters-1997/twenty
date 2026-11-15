import * as stylex from '@stylexjs/stylex';
import React from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Text } from 'twenty-ui/primitives/typography';
import { fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  groupHeadingContainer: {
    alignItems: 'center',
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-2'],
    userSelect: 'none',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-0_5'],
  },
  displayLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
});

type SidePanelGroupProps = {
  heading: string;
  children: React.ReactNode | React.ReactNode[];
};

export const SidePanelGroup = ({ heading, children }: SidePanelGroupProps) => {
  if (!isDefined(children) || !React.Children.count(children)) {
    return null;
  }
  return (
    <>
      <div {...stylex.props(styles.groupHeadingContainer)}>
        <Text {...stylex.props(styles.displayLabel)}>{heading}</Text>
      </div>
      <div {...stylex.props(styles.group)}>{children}</div>
    </>
  );
};
