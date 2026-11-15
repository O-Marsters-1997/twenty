import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { IconHelp, IconX } from '@ui/icon/components/TablerIcons';
import { Button } from '@ui/primitives/input/Button/Button';
import { FEEDBACK_STATUS_COLORS } from '@ui/primitives/feedback/internal/constants/FeedbackStatusColors';
import { themeCssVariables } from '@ui/theme';
import { isRenderableSlot } from '@ui/utilities/internal/isRenderableSlot';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import {
  borderRadius,
  color as themeColor,
  fontColor,
  font,
  fontSize,
  fontWeight,
  iconSize,
  spacing,
} from '../../../../theme/tokens.stylex';
import { type CalloutProps } from '../types/CalloutProps';

export const CalloutComponent = ({
  status = 'info',
  variant = 'soft',
  color = FEEDBACK_STATUS_COLORS[status],
  title,
  description,
  fullWidth = false,
  icon = <IconHelp size={themeCssVariables.icon.size.md} aria-hidden="true" />,
  action,
  closeLabel = 'Close',
  onDismiss,
  className,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<CalloutProps>) => {
  const hasIcon = isRenderableSlot(icon);
  const hasAction = isRenderableSlot(action);

  return useRender({
    render,
    ref,
    state: { status, variant, color },
    props: {
      ...props,
      ...mergeStylexProps(
        stylex.props(
          styles.container,
          containerColorStyles[color],
          fullWidth && styles.containerFullWidth,
          xstyle,
        ),
        className,
      ),
      children: (
        <>
          <div {...stylex.props(styles.header)}>
            {hasIcon && (
              <div
                {...stylex.props(styles.iconContainer, iconColorStyles[color])}
              >
                {icon}
              </div>
            )}
            <div {...stylex.props(styles.title)}>{title}</div>
            {isDefined(onDismiss) && (
              <Button
                type="button"
                startIcon={<IconX aria-hidden="true" />}
                xstyle={styles.closeButton}
                variant="ghost"
                size="sm"
                aria-label={closeLabel}
                onClick={() => onDismiss()}
              />
            )}
          </div>
          {isRenderableSlot(description) && (
            <div
              {...stylex.props(
                styles.descriptionWrapper,
                hasIcon && styles.descriptionWrapperWithIcon,
                hasAction && styles.descriptionWrapperWithAction,
              )}
            >
              <div {...stylex.props(styles.description)}>{description}</div>
            </div>
          )}
          {hasAction && <div {...stylex.props(styles.footer)}>{action}</div>}
        </>
      ),
    },
  });
};

const containerColorStyles = stylex.create({
  gray: {
    backgroundColor: themeColor['--t-color-gray1'],
    borderColor: themeColor['--t-color-gray6'],
  },
  blue: {
    backgroundColor: themeColor['--t-color-blue1'],
    borderColor: themeColor['--t-color-blue6'],
  },
  green: {
    backgroundColor: themeColor['--t-color-green1'],
    borderColor: themeColor['--t-color-green6'],
  },
  orange: {
    backgroundColor: themeColor['--t-color-orange1'],
    borderColor: themeColor['--t-color-orange6'],
  },
  red: {
    backgroundColor: themeColor['--t-color-red1'],
    borderColor: themeColor['--t-color-red6'],
  },
});

const iconColorStyles = stylex.create({
  gray: { color: themeColor['--t-color-gray9'] },
  blue: { color: themeColor['--t-color-blue9'] },
  green: { color: themeColor['--t-color-green9'] },
  orange: { color: themeColor['--t-color-orange9'] },
  red: { color: themeColor['--t-color-red9'] },
});

const styles = stylex.create({
  container: {
    alignItems: 'flex-start',
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    maxWidth: 512,
    paddingBlockEnd: spacing['--t-spacing-2'],
    paddingBlockStart: spacing['--t-spacing-3'],
    paddingInline: spacing['--t-spacing-3'],
    width: '100%',
  },
  containerFullWidth: {
    maxWidth: 'none',
  },
  header: {
    alignItems: 'center',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-2'],
    minHeight: spacing['--t-spacing-6'],
  },
  iconContainer: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    height: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    justifyContent: 'center',
    width: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  descriptionWrapper: {
    alignItems: 'center',
    alignSelf: 'stretch',
    display: 'flex',
    paddingBottom: spacing['--t-spacing-2'],
  },
  descriptionWrapperWithIcon: {
    paddingInlineStart: `calc(${iconSize['--t-icon-size-md']} * 1px + ${spacing['--t-spacing-2']})`,
  },
  descriptionWrapperWithAction: {
    paddingBottom: 0,
  },
  description: {
    color: fontColor['--t-font-color-tertiary'],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: 1.4,
  },
  footer: {
    alignItems: 'center',
    alignSelf: 'stretch',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  closeButton: {
    inlineSize: spacing['--t-spacing-6'],
    maxInlineSize: 'none',
    paddingInline: 0,
  },
});
