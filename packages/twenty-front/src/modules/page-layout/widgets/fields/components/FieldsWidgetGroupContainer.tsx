import { styled } from '@linaria/react';
import { useState } from 'react';
import { Section } from 'twenty-ui/components/layout';
import { IconChevronDown } from 'twenty-ui/icon';
import { Collapsible } from 'twenty-ui/primitives/layout';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
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

const StyledChevronWrapper = styled.div<{ isExpanded: boolean }>`
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  transform: ${({ isExpanded }) =>
    isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform
    calc(${themeCssVariables.animation.duration.normal} * 1s) ease;
`;

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
        <StyledChevronWrapper isExpanded={isExpanded}>
          <IconChevronDown
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
          />
        </StyledChevronWrapper>
      </header>
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Panel>{children}</Collapsible.Panel>
      </Collapsible.Root>
    </Section.Root>
  );
};
