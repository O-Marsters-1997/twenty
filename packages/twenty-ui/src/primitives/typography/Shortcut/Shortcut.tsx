import { isNonEmptyArray } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { Fragment } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { useIsMobile } from '@ui/utilities/responsive/hooks/useIsMobile';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { getShortcutPresentation } from './internal/getShortcutPresentation';
import { shortcutStyles } from './Shortcut.stylex';
import { type ShortcutProps } from './types/ShortcutProps';

export const Shortcut = ({
  shortcut,
  platform,
  sequenceJoinLabel,
  combinationSeparator,
  variant = 'keys',
  visibility = 'always',
  className,
  xstyle,
  'aria-label': ariaLabel,
  ...props
}: WithXstyle<ShortcutProps>) => {
  const isMobile = useIsMobile();
  const presentation = getShortcutPresentation({
    shortcut,
    platform,
    sequenceJoinLabel,
    combinationSeparator,
  });

  if (
    !isNonEmptyArray(presentation.groups) ||
    (visibility === 'desktop' && isMobile)
  ) {
    return null;
  }

  return (
    <span
      {...props}
      {...mergeStylexProps(
        stylex.props(
          shortcutStyles.root,
          variant === 'text' && shortcutStyles.variantText,
          variant === 'button' && shortcutStyles.variantButton,
          xstyle,
        ),
        className,
      )}
      data-variant={variant}
      role="img"
      aria-label={ariaLabel ?? presentation.accessibleLabel}
    >
      <span {...stylex.props(shortcutStyles.content)} aria-hidden>
        {variant !== 'keys'
          ? presentation.text
          : presentation.groups.map((keys, stepIndex) => (
              <Fragment key={stepIndex}>
                {stepIndex > 0 && (
                  <span>{` ${presentation.sequenceJoinLabel} `}</span>
                )}
                <span {...stylex.props(shortcutStyles.combination)}>
                  {keys.map((key, keyIndex) => (
                    <Fragment key={keyIndex}>
                      {keyIndex > 0 && presentation.separator}
                      <kbd {...stylex.props(shortcutStyles.key)}>{key}</kbd>
                    </Fragment>
                  ))}
                </span>
              </Fragment>
            ))}
      </span>
    </span>
  );
};
