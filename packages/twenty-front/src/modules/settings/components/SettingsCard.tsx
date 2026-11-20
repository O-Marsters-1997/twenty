import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { actionMarker } from './SettingsCard.stylex';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronRight } from 'twenty-ui/icon';
import { Badge } from 'twenty-ui/primitives/data-display';
import { Card } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';
import {
  background,
  color,
  fontColor,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsCardProps = {
  description?: string;
  disabled?: boolean;
  soon?: boolean;
  Icon: ReactNode;
  iconColor?: string;
  onClick?: () => void;
  title: string;
  Status?: ReactNode;
};

const styles = stylex.create({
  wrapper: {
    width: '100%',
  },
  wrapperEnabled: {
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'default',
  },
  wrapperDisabled: {
    color: fontColor['--t-font-color-extra-light'],
    cursor: 'not-allowed',
  },
  card: {
    color: 'inherit',
  },
  content: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  contentActionHover: {
    backgroundColor: {
      default: null,
      [stylex.when.descendant(':hover', actionMarker)]:
        background['--t-background-quaternary'],
    },
    cursor: {
      default: null,
      [stylex.when.descendant(':hover', actionMarker)]: 'pointer',
    },
  },
  contentLinkHover: {
    ':hover': {
      backgroundColor: background['--t-background-quaternary'],
      cursor: 'pointer',
    },
  },
  action: {
    ':focus-visible': {
      outlineColor: color['--t-color-blue'],
      outlineOffset: '-2px',
      outlineStyle: 'solid',
      outlineWidth: '2px',
    },
    inset: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    position: 'absolute',
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
  },
  header: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
  },
  iconChevronRightContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
  },
  description: {
    lineHeight: textLineHeight['--t-text-line-height-lg'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-7'],
  },
  title: {
    gap: spacing['--t-spacing-2'],
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    flexBasis: 'auto',
    flexGrow: 1,
    flexShrink: 0,
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: 'flex-start',
  },
  titleDisabled: {
    color: fontColor['--t-font-color-extra-light'],
  },
  iconContainer: {
    alignItems: 'center',
    color: 'inherit',
    display: 'flex',
    justifyContent: 'center',
    height: '24px',
    width: '24px',
  },
  iconContainerDisabled: {
    color: fontColor['--t-font-color-extra-light'],
  },
  iconContainerColor: (iconColor: string) => ({
    color: iconColor,
  }),
});

export const SettingsCard = ({
  description,
  soon,
  disabled = soon,
  Icon,
  iconColor,
  onClick,
  title,
  Status,
}: SettingsCardProps) => {
  const theme = useTheme();
  const hasAction = isDefined(onClick);

  return (
    <div
      {...stylex.props(
        styles.wrapper,
        disabled ? styles.wrapperDisabled : styles.wrapperEnabled,
      )}
    >
      <Card.Root
        rounded={true}
        fullWidth
        className={stylex.props(styles.card).className}
      >
        <Card.Content
          className={
            stylex.props(
              styles.content,
              hasAction
                ? styles.contentActionHover
                : !disabled && styles.contentLinkHover,
            ).className
          }
        >
          {hasAction && (
            <button
              {...stylex.props(styles.action, !disabled && actionMarker)}
              type="button"
              aria-label={title}
              onClick={onClick}
              disabled={disabled}
            />
          )}
          <div {...stylex.props(styles.header)}>
            <div
              {...stylex.props(
                styles.iconContainer,
                isDefined(iconColor) && styles.iconContainerColor(iconColor),
                disabled && styles.iconContainerDisabled,
              )}
            >
              {Icon}
            </div>
            <div
              {...stylex.props(styles.title, disabled && styles.titleDisabled)}
            >
              {title}
              {soon && <Badge>{t`Soon`}</Badge>}
            </div>
            {isDefined(Status) && Status}
            <span {...stylex.props(styles.iconChevronRightContainer)}>
              <IconChevronRight size={theme.icon.size.sm} />
            </span>
          </div>
          {description && (
            <div {...stylex.props(styles.description)}>{description}</div>
          )}
        </Card.Content>
      </Card.Root>
    </div>
  );
};
