import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsCardPartProps = {
  children?: ReactNode;
  id?: string;
  xstyle?: stylex.StyleXStyles;
};

export const StyledSettingsCardContent = ({
  children,
  xstyle,
}: StyledSettingsCardContentProps) => (
  <div {...stylex.props(styles.content, xstyle)}>{children}</div>
);

export const StyledSettingsCardIcon = ({
  children,
  xstyle,
}: StyledSettingsCardIconProps) => (
  <div {...stylex.props(styles.icon, xstyle)}>{children}</div>
);

export const StyledSettingsCardTitle = ({
  children,
  id,
  xstyle,
}: StyledSettingsCardTitleProps) => (
  <div id={id} {...stylex.props(styles.title, xstyle)}>
    {children}
  </div>
);

export const StyledSettingsCardTextContainer = ({
  children,
  xstyle,
}: StyledSettingsCardTextContainerProps) => (
  <div {...stylex.props(styles.textContainer, xstyle)}>{children}</div>
);

export const StyledSettingsCardDescription = ({
  children,
  id,
  xstyle,
}: StyledSettingsCardDescriptionProps) => (
  <div id={id} {...stylex.props(styles.description, xstyle)}>
    {children}
  </div>
);

export const StyledSettingsCardThirdLine = ({
  children,
  xstyle,
}: StyledSettingsCardThirdLineProps) => (
  <div {...stylex.props(styles.thirdLine, xstyle)}>{children}</div>
);

const styles = stylex.create({
  content: {
    padding: spacing['--t-spacing-4'],
    gap: spacing['--t-spacing-3'],
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    display: 'flex',
    height: 'auto',
  },
  icon: {
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    height: spacing['--t-spacing-8'],
    minWidth: spacing['--t-spacing-8'],
    width: spacing['--t-spacing-8'],
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginBottom: spacing['--t-spacing-1'],
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: textLineHeight['--t-text-line-height-lg'],
  },
  thirdLine: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
    marginTop: spacing['--t-spacing-1'],
  },
});
