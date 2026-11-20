import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { PageLayoutWidgetNoDataDisplay } from '@/page-layout/widgets/components/PageLayoutWidgetNoDataDisplay';
import { WidgetSkeletonLoader } from '@/page-layout/widgets/components/WidgetSkeletonLoader';
import { useState } from 'react';
import { getSafeUrl, isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  background,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    borderRadius: borderRadius['--t-border-radius-md'],
    overflow: 'hidden',
    backgroundColor: background['--t-background-primary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    width: '100%',
  },
  iframe: {
    borderWidth: 0,
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    height: '100%',
    width: '100%',
  },
  noPointerEvents: { pointerEvents: 'none' },
  loadingContainer: {
    background: background['--t-background-primary'],
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: '1',
    bottom: '0',
    left: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    right: '0',
    top: '0',
  },
  errorContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
  },
});

export type IframeWidgetProps = {
  widget: PageLayoutWidget;
};

export const IframeWidget = ({ widget }: IframeWidgetProps) => {
  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  const configuration = widget.configuration;

  if (!isDefined(configuration) || !('url' in configuration)) {
    throw new Error(`Invalid configuration for widget ${widget.id}`);
  }

  const url = configuration.url;
  const title = widget.title;

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const safeUrl = isDefined(url) ? getSafeUrl(url) : undefined;
  const isHttpUrl = isDefined(safeUrl) && /^https?:\/\//i.test(safeUrl);

  if (hasError || !isHttpUrl) {
    return (
      <div
        {...stylex.props(
          styles.container,
          isPageLayoutInEditMode && styles.noPointerEvents,
        )}
      >
        <div {...stylex.props(styles.errorContainer)}>
          <PageLayoutWidgetNoDataDisplay />
        </div>
      </div>
    );
  }

  return (
    <div
      {...stylex.props(
        styles.container,
        isPageLayoutInEditMode && styles.noPointerEvents,
      )}
    >
      {isLoading && (
        <div {...stylex.props(styles.loadingContainer)}>
          <WidgetSkeletonLoader />
        </div>
      )}
      <iframe
        src={safeUrl}
        title={title}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        allow="encrypted-media"
        allowFullScreen
        {...stylex.props(
          styles.iframe,
          isPageLayoutInEditMode && styles.noPointerEvents,
        )}
      />
    </div>
  );
};
