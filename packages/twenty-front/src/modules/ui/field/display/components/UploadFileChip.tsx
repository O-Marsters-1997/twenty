import { IconArrowUp } from 'twenty-ui/icon';
import { Loader } from 'twenty-ui/primitives/feedback';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    cornerShape: 'round',
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    display: 'flex',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm-round'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm-round'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm-round'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm-round'],
    height: spacing['--t-spacing-5'],
    marginRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: '0',
  },
  iconBox: {
    cornerShape: 'round',
    alignItems: 'center',
    backgroundColor: fontColor['--t-font-color-tertiary'],
    color: background['--t-background-primary'],
    display: 'flex',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm-round'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm-round'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm-round'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm-round'],
    height: '14px',
    width: '14px',
  },
  staticLoader: {
    borderColor: fontColor['--t-font-color-tertiary'],
    borderStyle: 'solid',
    borderWidth: '1px',
    cornerShape: 'round',
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-pill'],
    borderBottomRightRadius: borderRadius['--t-border-radius-pill'],
    borderTopLeftRadius: borderRadius['--t-border-radius-pill'],
    borderTopRightRadius: borderRadius['--t-border-radius-pill'],
    height: '12px',
    width: '24px',
  },
});

type UploadFileChipProps = {
  isLoading?: boolean;
};

export const UploadFileChip = ({ isLoading = true }: UploadFileChipProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.iconBox)}>
        <IconArrowUp size={theme.icon.size.sm} />
      </div>
      {isLoading ? <Loader /> : <div {...stylex.props(styles.staticLoader)} />}
    </div>
  );
};
