import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';
import { Separator } from 'twenty-ui/primitives/layout';
import { Text } from 'twenty-ui/primitives/typography';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    marginBlock: spacing['--t-spacing-3'],
    width: '100%',
  },
  containerNoMargin: {
    marginBlock: 0,
  },
  label: {
    color: fontColor['--t-font-color-light'],
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginInline: spacing['--t-spacing-2'],
  },
  labelColor: (color: string) => ({ color }),
  separator: {
    flexGrow: 1,
    width: 'auto',
  },
  separatorColor: (backgroundColor: string) => ({ backgroundColor }),
});

type LabeledDividerProps = {
  children: string;
  noMargin?: boolean;
  color?: string;
  textPosition?: 'center' | 'end';
};

export const LabeledDivider = ({
  children,
  noMargin = false,
  color,
  textPosition = 'center',
}: LabeledDividerProps) => {
  const separatorProps = stylex.props(
    styles.separator,
    color !== undefined && styles.separatorColor(color),
  );

  return (
    <div
      role="separator"
      aria-label={children}
      {...stylex.props(styles.container, noMargin && styles.containerNoMargin)}
    >
      <Separator aria-hidden {...separatorProps} />
      <Text
        render={<span />}
        {...stylex.props(
          styles.label,
          color !== undefined && styles.labelColor(color),
        )}
      >
        {children}
      </Text>
      {textPosition === 'center' && (
        <Separator aria-hidden {...separatorProps} />
      )}
    </div>
  );
};
