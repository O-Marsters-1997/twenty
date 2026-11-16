import * as stylex from '@stylexjs/stylex';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

const BREADCRUMB_WIDTH = 24;
const ICON_CENTER_OFFSET = 8;

export type SettingsMessageFoldersBreadcrumbProps = {
  depth: number;
  isLast: boolean;
  parentsIsLastList: boolean[];
};

// Insets from the side the tree grows out of, so the connector mirrors under dir="rtl".
const styles = stylex.create({
  overlay: (depth: number) => ({
    height: '28px',
    insetInlineStart: 0,
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    width: `${depth * BREADCRUMB_WIDTH}px`,
  }),
  ancestorLine: (index: number) => ({
    height: '28px',
    insetInlineStart: `${index * BREADCRUMB_WIDTH + ICON_CENTER_OFFSET}px`,
    position: 'absolute',
    top: 0,
    width: '1px',
  }),
  ancestorLineVisible: {
    background: borderColor['--t-border-color-strong'],
  },
  connector: (depth: number) => ({
    height: '28px',
    insetInlineStart: `${(depth - 1) * BREADCRUMB_WIDTH + ICON_CENTER_OFFSET}px`,
    position: 'absolute',
    top: 0,
    width: `${BREADCRUMB_WIDTH - ICON_CENTER_OFFSET}px`,
  }),
  verticalLineTop: {
    background: borderColor['--t-border-color-strong'],
    height: '12px',
    insetInlineStart: '0',
    position: 'absolute',
    top: '0',
    width: '1px',
  },
  roundedCorner: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-strong'],
    borderEndStartRadius: '4px',
    borderInlineStartWidth: '1px',
    borderInlineStartStyle: 'solid',
    borderInlineStartColor: borderColor['--t-border-color-strong'],
    height: '8px',
    insetInlineStart: '0',
    position: 'absolute',
    top: '6px',
    width: '8px',
  },
  verticalLineBottom: {
    background: borderColor['--t-border-color-strong'],
    height: '16px',
    insetInlineStart: '0',
    position: 'absolute',
    top: '12px',
    width: '1px',
  },
});

export const SettingsMessageFoldersBreadcrumb = ({
  depth,
  isLast,
  parentsIsLastList,
}: SettingsMessageFoldersBreadcrumbProps) => {
  const showVerticalBar = !isLast;

  return (
    <div {...stylex.props(styles.overlay(depth))}>
      {parentsIsLastList.map((parentIsLast, index) => (
        <div
          key={index}
          {...stylex.props(
            styles.ancestorLine(index),
            !parentIsLast && styles.ancestorLineVisible,
          )}
        />
      ))}
      <div {...stylex.props(styles.connector(depth))}>
        <div {...stylex.props(styles.verticalLineTop)} />
        <div {...stylex.props(styles.roundedCorner)} />
        {showVerticalBar && (
          <div {...stylex.props(styles.verticalLineBottom)} />
        )}
      </div>
    </div>
  );
};
