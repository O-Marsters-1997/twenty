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
    insetInlineStart: 0,
    pointerEvents: 'none',
    position: 'absolute',
    height: '28px',
    top: 0,
    width: `${depth * BREADCRUMB_WIDTH}px`,
  }),
  ancestorLine: (index: number) => ({
    insetInlineStart: `${index * BREADCRUMB_WIDTH + ICON_CENTER_OFFSET}px`,
    position: 'absolute',
    height: '28px',
    top: 0,
    width: '1px',
  }),
  ancestorLineVisible: {
    background: borderColor['--t-border-color-strong'],
  },
  connector: (depth: number) => ({
    insetInlineStart: `${(depth - 1) * BREADCRUMB_WIDTH + ICON_CENTER_OFFSET}px`,
    position: 'absolute',
    height: '28px',
    top: 0,
    width: `${BREADCRUMB_WIDTH - ICON_CENTER_OFFSET}px`,
  }),
  verticalLineTop: {
    background: borderColor['--t-border-color-strong'],
    insetInlineStart: '0',
    position: 'absolute',
    height: '12px',
    top: '0',
    width: '1px',
  },
  roundedCorner: {
    borderEndStartRadius: '4px',
    borderInlineStartColor: borderColor['--t-border-color-strong'],
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: '1px',
    insetInlineStart: '0',
    position: 'absolute',
    borderBottomColor: borderColor['--t-border-color-strong'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    height: '8px',
    top: '6px',
    width: '8px',
  },
  verticalLineBottom: {
    background: borderColor['--t-border-color-strong'],
    insetInlineStart: '0',
    position: 'absolute',
    height: '16px',
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
