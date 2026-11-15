import { usePageLayoutContentContext } from '@/page-layout/contexts/PageLayoutContentContext';
import { useCreateRecordPageFieldWidget } from '@/page-layout/hooks/useCreateRecordPageFieldWidget';
import { useCreateRecordPageFieldsWidget } from '@/page-layout/hooks/useCreateRecordPageFieldsWidget';
import { useCreateRecordPageNoteWidget } from '@/page-layout/hooks/useCreateRecordPageNoteWidget';
import { useInsertCreatedWidgetAtContext } from '@/page-layout/hooks/useInsertCreatedWidgetAtContext';
import { useNavigateToMoreWidgets } from '@/page-layout/hooks/useNavigateToMoreWidgets';
import { type WidgetInsertionContext } from '@/page-layout/states/widgetInsertionContextComponentState';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { t } from '@lingui/core/macro';
import { MenuItem } from 'twenty-ui/components/navigation';
import {
  IconListDetails,
  IconListSearch,
  IconNotes,
  IconPlus,
} from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor, borderRadius, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    width: '100%',
  },
  header: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    height: spacing['--t-spacing-6'],
    paddingInline: spacing['--t-spacing-1'],
  },
  menuItemList: {
    backgroundColor: background['--t-background-secondary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    marginTop: spacing['--t-spacing-2'],
    overflow: 'hidden',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
});

type RecordPageAddWidgetSectionProps = {
  insertionContext?: WidgetInsertionContext;
};

export const RecordPageAddWidgetSection = ({
  insertionContext = null,
}: RecordPageAddWidgetSectionProps) => {
  const { tabId } = usePageLayoutContentContext();

  const { createRecordPageFieldsWidget } = useCreateRecordPageFieldsWidget();

  const { createRecordPageFieldWidget } = useCreateRecordPageFieldWidget();

  const { createRecordPageNoteWidget } = useCreateRecordPageNoteWidget();

  const { navigateToMoreWidgets } = useNavigateToMoreWidgets();

  const { insertCreatedWidgetAtContext } = useInsertCreatedWidgetAtContext();

  const handleCreateWidget = (createWidget: () => PageLayoutWidget) => {
    const widget = createWidget();
    insertCreatedWidgetAtContext({ newWidgetId: widget.id, insertionContext });
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.header)}>{t`Add widget`}</div>
      <div {...stylex.props(styles.menuItemList)}>
        <MenuItem
          LeftIcon={IconListDetails}
          withIconContainer
          text={t`Fields group`}
          contextualText={t`Group multiple fields from this record`}
          onClick={() => handleCreateWidget(createRecordPageFieldsWidget)}
        />
        <MenuItem
          LeftIcon={IconListSearch}
          withIconContainer
          text={t`Field`}
          contextualText={t`Single field with smart formats`}
          onClick={() => handleCreateWidget(createRecordPageFieldWidget)}
        />
        <MenuItem
          LeftIcon={IconNotes}
          withIconContainer
          text={t`Note`}
          contextualText={t`Static text shared across all record pages`}
          onClick={() =>
            handleCreateWidget(() => createRecordPageNoteWidget({ tabId }))
          }
        />
        <MenuItem
          LeftIcon={IconPlus}
          withIconContainer
          text={t`More widgets`}
          hasSubMenu
          onClick={() => navigateToMoreWidgets(insertionContext)}
        />
      </div>
    </div>
  );
};
