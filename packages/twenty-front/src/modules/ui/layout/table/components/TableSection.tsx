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
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    textAlign: 'left',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    height: spacing['--t-spacing-6'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: '0',
  },
  section: {
    overflow: 'hidden',
    opacity: 0,
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'max-height, opacity',
    maxHeight: 0,
  },
  sectionExpanded: {
    opacity: 1,
    maxHeight: 'fit-content',
  },
  displayLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  sectionContentContainer: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
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
