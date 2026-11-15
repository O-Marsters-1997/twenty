import { type ReactNode, useState } from 'react';
import { IconChevronDown, IconChevronUp } from 'twenty-ui/icon';
import { Text } from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';
import { TableBody } from './TableBody';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  backgroundTransparent,
  borderColor,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type TableSectionProps = {
  children: ReactNode;
  isInitiallyExpanded?: boolean;
  title: string;
};

const styles = stylex.create({
  sectionHeader: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    cursor: 'pointer',
    display: 'flex',
    height: spacing['--t-spacing-6'],
    justifyContent: 'space-between',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    textAlign: 'left',
  },
  section: {
    maxHeight: 0,
    opacity: 0,
    overflow: 'hidden',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'max-height, opacity',
  },
  sectionExpanded: {
    maxHeight: 'fit-content',
    opacity: 1,
  },
  displayLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  sectionContentContainer: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
  },
});

export const TableSection = ({
  children,
  isInitiallyExpanded = true,
  title,
}: TableSectionProps) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);

  const handleToggleSection = () =>
    setIsExpanded((previousIsExpanded) => !previousIsExpanded);

  return (
    <>
      <div
        onClick={handleToggleSection}
        {...stylex.props(styles.sectionHeader)}
      >
        <Text {...stylex.props(styles.displayLabel)}>{title}</Text>
        {isExpanded ? (
          <IconChevronUp
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
            color={theme.font.color.light}
          />
        ) : (
          <IconChevronDown
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
            color={theme.font.color.light}
          />
        )}
      </div>
      <div
        {...stylex.props(styles.section, isExpanded && styles.sectionExpanded)}
      >
        <div {...stylex.props(styles.sectionContentContainer)}>
          <TableBody>{children}</TableBody>
        </div>
      </div>
    </>
  );
};
