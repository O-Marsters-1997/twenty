import { PageLayoutWidgetForbiddenDisplay } from '@/page-layout/widgets/components/PageLayoutWidgetForbiddenDisplay';
import { PageLayoutWidgetStatusDisplay } from '@/page-layout/widgets/components/PageLayoutWidgetStatusDisplay';
import { t } from '@lingui/core/macro';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  forbiddenContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
});

type PageLayoutWidgetErrorDisplayProps = {
  widgetId: string;
  error?: unknown;
};

export const PageLayoutWidgetErrorDisplay = ({
  widgetId,
  error,
}: PageLayoutWidgetErrorDisplayProps) => {
  if (isGraphqlErrorOfType(error, 'FORBIDDEN')) {
    return (
      <div {...stylex.props(styles.forbiddenContainer)}>
        <PageLayoutWidgetForbiddenDisplay
          widgetId={widgetId}
          restriction={{ type: null }}
        />
      </div>
    );
  }

  return (
    <PageLayoutWidgetStatusDisplay
      tooltipId={`widget-error-tooltip-${widgetId}`}
      text={t`Error`}
      tooltipContent={t`An error occurred while loading this widget.`}
    />
  );
};
