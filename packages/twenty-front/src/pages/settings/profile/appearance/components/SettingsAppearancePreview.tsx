import { styled } from '@linaria/react';
import { type CSSProperties } from 'react';

import {
  GRAY_SCALE_DARK,
  GRAY_SCALE_LIGHT,
  themeCssVariables,
} from 'twenty-ui/theme';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import * as stylex from '@stylexjs/stylex';
import { borderRadius } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  preview: {
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    height: '80px',
    overflow: 'hidden',
    width: '100%',
  },
});

const StyledSegment = styled.div`
  align-items: flex-end;
  background: var(--appearance-preview-background);
  border: 1px solid var(--appearance-preview-border);
  box-sizing: border-box;
  display: flex;
  flex: 1;
  min-width: 0;
  padding-inline-start: ${themeCssVariables.spacing[6]};
  padding-top: ${themeCssVariables.spacing[6]};

  &:first-child {
    border-end-start-radius: ${themeCssVariables.border.radius.md};
    border-start-start-radius: ${themeCssVariables.border.radius.md};
  }

  &:last-child {
    border-end-end-radius: ${themeCssVariables.border.radius.md};
    border-start-end-radius: ${themeCssVariables.border.radius.md};
  }
`;

const StyledContent = styled.div`
  background: var(--appearance-preview-content-background);
  border-inline-start: 1px solid var(--appearance-preview-border);
  border-start-start-radius: ${themeCssVariables.border.radius.md};
  border-top: 1px solid var(--appearance-preview-border);
  box-sizing: border-box;
  color: var(--appearance-preview-content-color);
  flex: 1;
  font-size: 20px;
  height: 56px;
  padding-inline-start: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
  transition:
    height 0.1s ease-in-out,
    font-size 0.1s ease-in-out;

  [role='radio']:not([data-disabled]):hover & {
    font-size: 22px;
    height: 61px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

type SettingsAppearancePreviewProps = {
  colorScheme: ColorScheme;
};

export const SettingsAppearancePreview = ({
  colorScheme,
}: SettingsAppearancePreviewProps) => {
  const segments = colorScheme === 'System' ? ['Light', 'Dark'] : [colorScheme];

  return (
    <div aria-hidden {...stylex.props(styles.preview)}>
      {segments.map((segment) => {
        const grayScale =
          segment === 'Dark' ? GRAY_SCALE_DARK : GRAY_SCALE_LIGHT;

        return (
          <StyledSegment
            key={segment}
            style={
              {
                '--appearance-preview-background': grayScale.gray4,
                '--appearance-preview-border': grayScale.gray5,
                '--appearance-preview-content-background': grayScale.gray1,
                '--appearance-preview-content-color': grayScale.gray12,
              } as CSSProperties
            }
          >
            <StyledContent>Aa</StyledContent>
          </StyledSegment>
        );
      })}
    </div>
  );
};
