import { CARD_ACTION_CLASS_NAME } from '@/ui/layout/card/styles/CardActionClassName';
import { css, cx } from '@linaria/core';
import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { type ReactNode, useId } from 'react';
import { Link } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronRight, type IconComponent } from 'twenty-ui/icon';
import { Card } from 'twenty-ui/primitives/surfaces';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing, font, text } from 'twenty-ui/theme/tokens.stylex';

const StyledRowContainer = styled.div`
  > div {
    align-items: center;
    box-sizing: border-box;
    display: flex;
    font-size: ${themeCssVariables.font.size.md};
    font-weight: ${themeCssVariables.font.weight.medium};
    gap: ${themeCssVariables.spacing[2]};
    height: ${themeCssVariables.spacing[10]};
    padding: ${themeCssVariables.spacing[2]};
    padding-left: ${themeCssVariables.spacing[3]};
    position: relative;

    > svg {
      flex-shrink: 0;
    }
  }
`;

const StyledRightContainer = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[1]};
  pointer-events: none;
  position: relative;
  z-index: 1;

  :is(
    a,
    button,
    input,
    select,
    textarea,
    [role='button'],
    [role='checkbox'],
    [role='link'],
    [role='switch']
  ) {
    pointer-events: auto;
  }
`;

const styles = stylex.create({
  content: {
    alignItems: 'center',
    display: 'flex',
    flex: '1 1 0',
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
    overflow: 'hidden',
  },
  label: {
    flex: '0 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  description: {
    color: font['--t-font-color-light'],
    flex: '1 1 0',
    fontWeight: font['--t-font-weight-regular'],
    lineHeight: text['--t-text-line-height-lg'],
    minWidth: '0',
    overflow: 'hidden',
    paddingLeft: spacing['--t-spacing-1'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

// Rows are fixed-height, so the description truncates first rather than wrapping or squeezing the label
const rowActionClassName = css`
  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

type SettingsListItemCardContentProps = {
  label: string;
  description?: string;
  divider?: boolean;
  LeftIcon?: IconComponent;
  LeftIconColor?: string;
  onClick?: () => void;
  rightComponent: ReactNode;
  to?: string;
};

export const SettingsListItemCardContent = ({
  label,
  description,
  divider,
  LeftIcon,
  LeftIconColor,
  onClick,
  rightComponent,
  to,
}: SettingsListItemCardContentProps) => {
  const theme = useTheme();
  const labelId = useId();
  const descriptionId = useId();
  const hasDescription = isNonEmptyString(description);

  return (
    <StyledRowContainer>
      <Card.Content divider={divider}>
        {isDefined(to) ? (
          <Link
            className={cx(CARD_ACTION_CLASS_NAME, rowActionClassName)}
            aria-labelledby={labelId}
            aria-describedby={hasDescription ? descriptionId : undefined}
            onClick={onClick}
            to={to}
          />
        ) : (
          isDefined(onClick) && (
            <button
              className={cx(CARD_ACTION_CLASS_NAME, rowActionClassName)}
              aria-labelledby={labelId}
              aria-describedby={hasDescription ? descriptionId : undefined}
              onClick={onClick}
              type="button"
            />
          )
        )}
        {isDefined(LeftIcon) && (
          <LeftIcon
            size={theme.icon.size.md}
            color={LeftIconColor ?? 'currentColor'}
          />
        )}
        <div {...stylex.props(styles.content)}>
          <span id={labelId} {...stylex.props(styles.label)}>{label}</span>
          {hasDescription && (
            <span id={descriptionId} {...stylex.props(styles.description)}>
              {description}
            </span>
          )}
        </div>
        <StyledRightContainer>
          {rightComponent}
          {isDefined(to) && (
            <IconChevronRight
              size={theme.icon.size.md}
              color={theme.font.color.tertiary}
            />
          )}
        </StyledRightContainer>
      </Card.Content>
    </StyledRowContainer>
  );
};
