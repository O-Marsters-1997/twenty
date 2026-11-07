import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';

const StyledFieldRow = styled.div`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  grid-template-columns: 92px minmax(0, 1fr);
  min-height: 24px;
`;

const StyledFieldLabel = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledFieldValue = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.regular};
  min-width: 0;
`;

type LogConsoleFieldRowProps = {
  Icon: IconComponent;
  label: string;
  children: ReactNode;
};

export const LogConsoleFieldRow = ({
  Icon,
  label,
  children,
}: LogConsoleFieldRowProps) => {
  const theme = useTheme();

  return (
    <StyledFieldRow>
      <StyledFieldLabel>
        <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
        <OverflowingTextWithTooltip text={label} />
      </StyledFieldLabel>
      <StyledFieldValue>{children}</StyledFieldValue>
    </StyledFieldRow>
  );
};
