import { CARD_ACTION_CLASS_NAME } from '@/ui/layout/card/styles/CardActionClassName';
import { styled } from '@linaria/react';

import { t } from '@lingui/core/macro';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronRight } from 'twenty-ui/icon';
import { Badge } from 'twenty-ui/primitives/data-display';
import { Card } from 'twenty-ui/primitives/surfaces';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing, font, text } from 'twenty-ui/theme/tokens.stylex';

type SettingsCardProps = {
  description?: string;
  disabled?: boolean;
  soon?: boolean;
  Icon: ReactNode;
  iconColor?: string;
  onClick?: () => void;
  title: string;
  className?: string;
  Status?: ReactNode;
};

const StyledCardWrapper = styled.div<{
  disabled?: boolean;
}>`
  color: ${({ disabled }) =>
    disabled
      ? themeCssVariables.font.color.extraLight
      : themeCssVariables.font.color.tertiary};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'default')};
  width: 100%;

  > div {
    color: inherit;
  }
`;

const StyledCardContentContainer = styled.div`
  > div {
    display: flex;
    flex-direction: column;
    gap: ${themeCssVariables.spacing[2]};
    padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[2]};
    position: relative;
  }

  a:hover & > div,
  > div:has(> button:not(:disabled):hover) {
    background-color: ${themeCssVariables.background.quaternary};
    cursor: pointer;
  }
`;

const StyledCardAction = styled.button`
  &:disabled {
    cursor: not-allowed;
  }
`;

const styles = stylex.create({
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  iconChevronRightContainer: {
    alignItems: 'center',
    color: font['--t-font-color-light'],
    display: 'flex',
  },
  description: {
    lineHeight: text['--t-text-line-height-lg'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-7'],
  },
});

const StyledTitle = styled.div<{ disabled?: boolean }>`
  color: ${({ disabled }) =>
    disabled
      ? themeCssVariables.font.color.extraLight
      : themeCssVariables.font.color.secondary};
  display: flex;
  flex: 1 0 auto;
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-start;
`;

const StyledIconContainer = styled.div<{
  disabled?: boolean;
  iconColor?: string;
}>`
  align-items: center;
  color: ${({ disabled, iconColor }) =>
    disabled
      ? themeCssVariables.font.color.extraLight
      : (iconColor ?? 'inherit')};
  display: flex;
  height: 24px;
  justify-content: center;
  width: 24px;
`;

export const SettingsCard = ({
  description,
  soon,
  disabled = soon,
  Icon,
  iconColor,
  onClick,
  title,
  className,
  Status,
}: SettingsCardProps) => {
  const theme = useTheme();

  return (
    <StyledCardWrapper disabled={disabled} className={className}>
      <Card.Root rounded={true} fullWidth>
        <StyledCardContentContainer>
          <Card.Content>
            {isDefined(onClick) && (
              <StyledCardAction
                className={CARD_ACTION_CLASS_NAME}
                type="button"
                aria-label={title}
                onClick={onClick}
                disabled={disabled}
              />
            )}
            <div {...stylex.props(styles.header)}>
              <StyledIconContainer disabled={disabled} iconColor={iconColor}>
                {Icon}
              </StyledIconContainer>
              <StyledTitle disabled={disabled}>
                {title}
                {soon && <Badge>{t`Soon`}</Badge>}
              </StyledTitle>
              {isDefined(Status) && Status}
              <span {...stylex.props(styles.iconChevronRightContainer)}>
                <IconChevronRight size={theme.icon.size.sm} />
              </span>
            </div>
            {description && (
              <div {...stylex.props(styles.description)}>{description}</div>
            )}
          </Card.Content>
        </StyledCardContentContainer>
      </Card.Root>
    </StyledCardWrapper>
  );
};
