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
    backgroundColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    height: '40px',
    padding: '2px',
    width: '32px',
  },
  previewCanvas: {
    backgroundColor: background['--t-background-secondary'],
    borderRadius: '2px',
    display: 'flex',
    flex: 1,
    gap: '2px',
    minWidth: 0,
    overflow: 'hidden',
    padding: '2px',
  },
  memberPreferenceCanvas: {
    flexDirection: 'column',
    position: 'relative',
  },
  memberPreferenceIcon: {
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    borderRadius: borderRadius['--t-border-radius-rounded'],
    boxSizing: 'border-box',
    color: accent['--t-accent-accent7'],
    cornerShape: 'round',
    display: 'flex',
    height: '16px',
    justifyContent: 'center',
    left: '50%',
    padding: '1px',
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '16px',
  },
  sidePanelPreview: {
    display: 'flex',
    flex: 1,
    gap: '2px',
    minHeight: 0,
  },
  sidePanelContent: {
    backgroundColor: borderColor['--t-border-color-medium'],
    borderRadius: '1px',
    flex: 1,
  },
  sidePanel: {
    backgroundColor: accent['--t-accent-accent7'],
    borderRadius: '1px',
    width: '6px',
  },
  fullPage: {
    alignItems: 'center',
    backgroundColor: accent['--t-accent-accent7'],
    borderRadius: '1px',
    color: fontColor['--t-font-color-inverted'],
    display: 'flex',
    flex: 1,
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
