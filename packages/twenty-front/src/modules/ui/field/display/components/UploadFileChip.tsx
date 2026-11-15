import { IconArrowUp } from 'twenty-ui/icon';
import { Loader } from 'twenty-ui/primitives/feedback';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, backgroundTransparent, borderRadius, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm-round'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm-round'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm-round'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm-round'],
    cornerShape: 'round',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-5'],
    marginRight: spacing['--t-spacing-1'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: fontColor['--t-font-color-tertiary'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm-round'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm-round'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm-round'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm-round'],
    color: background['--t-background-primary'],
    cornerShape: 'round',
    display: 'flex',
    height: '14px',
    justifyContent: 'center',
    width: '14px',
  },
  staticLoader: {
    alignItems: 'center',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: fontColor['--t-font-color-tertiary'],
    borderTopLeftRadius: borderRadius['--t-border-radius-pill'],
    borderTopRightRadius: borderRadius['--t-border-radius-pill'],
    borderBottomRightRadius: borderRadius['--t-border-radius-pill'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-pill'],
    boxSizing: 'border-box',
    cornerShape: 'round',
    display: 'flex',
    height: '12px',
    justifyContent: 'center',
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
