import { type AppErrorDisplayProps } from '@/error-handler/types/AppErrorDisplayProps';
import { t } from '@lingui/core/macro';
import { IconReload } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, borderRadius, grayScale } from 'twenty-ui/theme/tokens.stylex';

type AppRootErrorFallbackProps = AppErrorDisplayProps;

const styles = stylex.create({
  panel: {
    background: grayScale['--t-gray-scale-gray1'],
    borderColor: grayScale['--t-gray-scale-gray5'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    height: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    width: '100%',
  },
  button: {
    alignItems: 'center',
    background: grayScale['--t-gray-scale-gray1'],
    borderColor: grayScale['--t-gray-scale-gray5'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    color: grayScale['--t-gray-scale-gray12'],
    cursor: 'pointer',
    display: 'flex',
    paddingBlock: '8px',
    paddingInline: '16px',
  },
  container: {
    background: background['--t-background-noisy'],
    boxSizing: 'border-box',
    display: 'flex',
    height: 'calc(100vh / var(--t-zoom, 1))',
    paddingTop: '12px',
    paddingRight: '12px',
    paddingBottom: '12px',
    paddingLeft: '12px',
    width: 'calc(100vw / var(--t-zoom, 1))',
  },
  emptyContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    height: '100%',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
  },
  imageContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
  },
  backgroundImage: {
    maxHeight: '160px',
    maxWidth: '160px',
  },
  innerImage: {
    maxHeight: '130px',
    maxWidth: '130px',
    position: 'absolute',
  },
  emptyTextContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
  },
  emptyTitle: {
    color: grayScale['--t-gray-scale-gray12'],
    fontSize: '1.23rem',
    fontWeight: '600',
  },
  emptySubTitle: {
    color: grayScale['--t-gray-scale-gray11'],
    fontSize: '0.92rem',
    fontWeight: '400',
    lineHeight: '1.5',
    maxHeight: '2.8em',
    overflow: 'hidden',
    width: '50%',
  },
  iconContainer: {
    color: grayScale['--t-gray-scale-gray12'],
    display: 'inline-flex',
    marginRight: '8px',
  },
});

export const AppRootErrorFallback = ({
  resetErrorBoundary,
  title = t`Sorry, something went wrong`,
}: AppRootErrorFallbackProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.panel)}>
        <div {...stylex.props(styles.emptyContainer)}>
          <div {...stylex.props(styles.imageContainer)}>
            <img
              src="/images/placeholders/background/error_index_bg.png"
              alt={t`Background`} {...stylex.props(styles.backgroundImage)}
            />
            <img
              src="/images/placeholders/moving-image/error_index.png"
              alt={t`Error illustration`} {...stylex.props(styles.innerImage)}
            />
          </div>
          <div {...stylex.props(styles.emptyTextContainer)}>
            <div {...stylex.props(styles.emptyTitle)}>{title}</div>
            <div {...stylex.props(styles.emptySubTitle)}>
              {t`Please refresh the page.`}
            </div>
          </div>
          <button
            {...stylex.props(styles.button)}
            onClick={resetErrorBoundary}
          >
            <span {...stylex.props(styles.iconContainer)}>
              <IconReload size={theme.icon.size.md} />
            </span>
            {t`Reload`}
          </button>
        </div>
      </div>
    </div>
  );
};
