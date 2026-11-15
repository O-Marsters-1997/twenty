import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { FieldRichTextCard } from '@/page-layout/widgets/field-rich-text/components/FieldRichTextCard';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});

type FieldRichTextWidgetProps = {
  widget: PageLayoutWidget;
};

export const FieldRichTextWidget = ({
  widget: _widget,
}: FieldRichTextWidgetProps) => {
  return (
    <div {...stylex.props(styles.container)}>
      <FieldRichTextCard />
    </div>
  );
};
