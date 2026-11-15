import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { useCurrentWidgetOrNull } from '@/page-layout/widgets/hooks/useCurrentWidgetOrNull';
import { getWidgetHeaderActionDefinition } from '@/page-layout/widgets/utils/getWidgetHeaderActionDefinition';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import { isDefined } from 'twenty-shared/utils';
import { WidgetType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  actionsContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
});

export const WidgetCardHeaderActionsRenderer = () => {
  const widget = useCurrentWidgetOrNull();
  const { targetRecordIdentifier } = useLayoutRenderingContext();
  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  if (!isDefined(widget) || !isDefined(targetRecordIdentifier)) {
    return null;
  }

  // Activity actions create records, so they hide while arranging; field widget actions handle their own visibility.
  if (isPageLayoutInEditMode && widget.type !== WidgetType.FIELD) {
    return null;
  }

  const headerActionDefinition = getWidgetHeaderActionDefinition(widget);

  if (!isDefined(headerActionDefinition)) {
    return null;
  }

  const HeaderActionComponent = headerActionDefinition.Component;

  return (
    <div {...stylex.props(styles.actionsContainer)}>
      <HeaderActionComponent widget={widget} />
    </div>
  );
};
