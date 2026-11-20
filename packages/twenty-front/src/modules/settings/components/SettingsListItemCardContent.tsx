import { CARD_ACTION_CLASS_NAME } from '@/ui/layout/card/styles/CardActionClassName';
import { isNonEmptyString } from '@sniptt/guards';
import { type ReactNode, useId } from 'react';
import { Link } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronRight, type IconComponent } from 'twenty-ui/icon';
import { Card } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

import './SettingsListItemCardContent.css';

const styles = stylex.create({
  row: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    position: 'relative',
    height: spacing['--t-spacing-10'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  leftIcon: {
    flexShrink: 0,
  },
  content: {
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    flexBasis: '0',
    flexGrow: '1',
    flexShrink: '1',
    minWidth: '0',
  },
  label: {
    overflow: 'hidden',
    flexBasis: 'auto',
    flexGrow: '0',
    flexShrink: '1',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  description: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-light'],
    flexBasis: '0',
    flexGrow: '1',
    flexShrink: '1',
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-lg'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: '0',
    paddingLeft: spacing['--t-spacing-1'],
  },
  right: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    pointerEvents: 'none',
    position: 'relative',
    zIndex: 1,
  },
});

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
    <Card.Content divider={divider} {...stylex.props(styles.row)}>
      {isDefined(to) ? (
        <Link
          className={CARD_ACTION_CLASS_NAME}
          data-settings-list-item-action
          aria-labelledby={labelId}
          aria-describedby={hasDescription ? descriptionId : undefined}
          onClick={onClick}
          to={to}
        />
      ) : (
        isDefined(onClick) && (
          <button
            className={CARD_ACTION_CLASS_NAME}
            data-settings-list-item-action
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
          {...stylex.props(styles.leftIcon)}
        />
      )}
      <div {...stylex.props(styles.content)}>
        <span id={labelId} {...stylex.props(styles.label)}>
          {label}
        </span>
        {hasDescription && (
          <span id={descriptionId} {...stylex.props(styles.description)}>
            {description}
          </span>
        )}
      </div>
      <div data-settings-list-item-right {...stylex.props(styles.right)}>
        {rightComponent}
        {isDefined(to) && (
          <IconChevronRight
            size={theme.icon.size.md}
            color={theme.font.color.tertiary}
          />
        )}
      </div>
    </Card.Content>
  );
};
