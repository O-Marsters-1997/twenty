import { useState } from 'react';
import { Section } from 'twenty-ui/components/layout';
import { IconChevronDown } from 'twenty-ui/icon';
import { Collapsible } from 'twenty-ui/primitives/layout';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  fontColor,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  chevron: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    transform: 'rotate(0deg)',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease',
  },
  chevronExpanded: { transform: 'rotate(180deg)' },
  header: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    height: '24px',
    justifyContent: 'space-between',
  },
  titleLabel: {
    color: fontColor['--t-font-color-tertiary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
});

type FieldsWidgetGroupContainerProps = {
  children: React.ReactNode;
  title: string;
  defaultExpanded?: boolean;
};

export const FieldsWidgetGroupContainer = ({
  children,
  title,
  defaultExpanded = true,
}: FieldsWidgetGroupContainerProps) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggleGroup = () =>
    setIsExpanded((previousIsExpanded) => !previousIsExpanded);

  return (
    <Section.Root>
      <header onClick={handleToggleGroup} {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.titleLabel)}>{title}</div>
        <div
          {...stylex.props(
            styles.chevron,
            isExpanded && styles.chevronExpanded,
          )}
        >
          <IconChevronDown
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
          />
        </div>
      </header>
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Panel>{children}</Collapsible.Panel>
      </Collapsible.Root>
    </Section.Root>
  );
};
