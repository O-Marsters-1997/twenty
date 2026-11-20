import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

export type HeadingProps = {
  title: string;
  description?: string;
};

export const Heading = ({ title, description }: HeadingProps) => (
  <div {...stylex.props(styles.root)}>
    <span {...stylex.props(styles.title)}>{title}</span>
    {description && (
      <span {...stylex.props(styles.description)}>{description}</span>
    )}
  </div>
);

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-lg'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    textAlign: 'center',
  },
  description: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    textAlign: 'center',
    marginTop: spacing['--t-spacing-3'],
  },
});
