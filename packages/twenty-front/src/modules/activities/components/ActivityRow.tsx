import { CARD_ACTION_CLASS_NAME } from '@/ui/layout/card/styles/CardActionClassName';
import * as stylex from '@stylexjs/stylex';
import { type MouseEvent, type PropsWithChildren } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Card } from 'twenty-ui/primitives/surfaces';
import {
  backgroundTransparent,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  row: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: { default: 0, ':not(:last-child)': 1 },
  },
  content: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    height: spacing['--t-spacing-12'],
    paddingBlock: spacing['--t-spacing-0'],
    paddingInline: spacing['--t-spacing-4'],
    position: 'relative',
  },
  contentInteractive: {
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
    cursor: 'pointer',
  },
  action: {
    pointerEvents: { default: null, ':disabled': 'none' },
  },
});

const INDEPENDENT_ROW_ACTION_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="switch"]',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');

type ActivityRowProps = PropsWithChildren<{
  onClick?: () => void;
  disabled?: boolean;
  label: string;
}>;

export const ActivityRow = ({
  children,
  onClick,
  disabled,
  label,
}: ActivityRowProps) => {
  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;

    if (
      disabled ||
      event.defaultPrevented ||
      !(target instanceof Element) ||
      isDefined(target.closest(INDEPENDENT_ROW_ACTION_SELECTOR))
    ) {
      return;
    }

    onClick?.();
  };

  return (
    <div {...stylex.props(styles.row)}>
      <Card.Content
        onClick={handleContentClick}
        xstyle={[
          styles.content,
          isDefined(onClick) && !disabled && styles.contentInteractive,
        ]}
      >
        {isDefined(onClick) && (
          <button
            className={`${CARD_ACTION_CLASS_NAME} ${stylex.props(styles.action).className}`}
            type="button"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
          />
        )}
        {children}
      </Card.Content>
    </div>
  );
};
