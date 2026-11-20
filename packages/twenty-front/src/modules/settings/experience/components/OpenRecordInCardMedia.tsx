import { IconArrowsDiagonal, IconUserCircle } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import {
  accent,
  background,
  borderColor,
  borderRadius,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';

type OpenRecordInCardMediaProps = {
  type: 'member-preference' | 'side-panel' | 'full-page';
};

const styles = stylex.create({
  previewFrame: {
    padding: '2px',
    borderRadius: borderRadius['--t-border-radius-sm'],
    backgroundColor: borderColor['--t-border-color-medium'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    height: '40px',
    width: '32px',
  },
  previewCanvas: {
    padding: '2px',
    borderRadius: '2px',
    gap: '2px',
    overflow: 'hidden',
    backgroundColor: background['--t-background-secondary'],
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  memberPreferenceCanvas: {
    flexDirection: 'column',
    position: 'relative',
  },
  memberPreferenceIcon: {
    padding: '1px',
    borderRadius: borderRadius['--t-border-radius-rounded'],
    cornerShape: 'round',
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    boxSizing: 'border-box',
    color: accent['--t-accent-accent7'],
    display: 'flex',
    justifyContent: 'center',
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    height: '16px',
    left: '50%',
    top: '50%',
    width: '16px',
  },
  sidePanelPreview: {
    gap: '2px',
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  sidePanelContent: {
    borderRadius: '1px',
    backgroundColor: borderColor['--t-border-color-medium'],
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
  },
  sidePanel: {
    borderRadius: '1px',
    backgroundColor: accent['--t-accent-accent7'],
    width: '6px',
  },
  fullPage: {
    borderRadius: '1px',
    alignItems: 'center',
    backgroundColor: accent['--t-accent-accent7'],
    color: fontColor['--t-font-color-inverted'],
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    minHeight: 0,
  },
});

const SidePanelPreview = () => (
  <div {...stylex.props(styles.sidePanelPreview)}>
    <div {...stylex.props(styles.sidePanelContent)} />
    <div {...stylex.props(styles.sidePanel)} />
  </div>
);

export const OpenRecordInCardMedia = ({ type }: OpenRecordInCardMediaProps) => {
  if (type === 'member-preference') {
    return (
      <div {...stylex.props(styles.previewFrame)}>
        <div
          {...stylex.props(styles.previewCanvas, styles.memberPreferenceCanvas)}
        >
          <SidePanelPreview />
          <div {...stylex.props(styles.fullPage)} />
          <div {...stylex.props(styles.memberPreferenceIcon)}>
            <IconUserCircle size={14} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.previewFrame)}>
      <div {...stylex.props(styles.previewCanvas)}>
        {type === 'side-panel' ? (
          <SidePanelPreview />
        ) : (
          <div {...stylex.props(styles.fullPage)}>
            <IconArrowsDiagonal size={14} />
          </div>
        )}
      </div>
    </div>
  );
};
