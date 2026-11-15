import { styled } from '@linaria/react';
import { IconArrowsDiagonal, IconUserCircle } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { border, background, accent, font } from 'twenty-ui/theme/tokens.stylex';

type OpenRecordInCardMediaProps = {
  type: 'member-preference' | 'side-panel' | 'full-page';
};

const styles = stylex.create({
  previewFrame: {
    backgroundColor: border['--t-border-color-medium'],
    borderTopLeftRadius: border['--t-border-radius-sm'],
    borderTopRightRadius: border['--t-border-radius-sm'],
    borderBottomRightRadius: border['--t-border-radius-sm'],
    borderBottomLeftRadius: border['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    height: '40px',
    paddingTop: '2px',
    paddingRight: '2px',
    paddingBottom: '2px',
    paddingLeft: '2px',
    width: '32px',
  },
  memberPreferenceIcon: {
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    borderTopLeftRadius: border['--t-border-radius-rounded'],
    borderTopRightRadius: border['--t-border-radius-rounded'],
    borderBottomRightRadius: border['--t-border-radius-rounded'],
    borderBottomLeftRadius: border['--t-border-radius-rounded'],
    boxSizing: 'border-box',
    color: accent['--t-accent-accent7'],
    cornerShape: 'round',
    display: 'flex',
    height: '16px',
    justifyContent: 'center',
    left: '50%',
    paddingTop: '1px',
    paddingRight: '1px',
    paddingBottom: '1px',
    paddingLeft: '1px',
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '16px',
  },
  sidePanelPreview: {
    display: 'flex',
    flex: '1',
    gap: '2px',
    minHeight: '0',
  },
  sidePanelContent: {
    backgroundColor: border['--t-border-color-medium'],
    borderTopLeftRadius: '1px',
    borderTopRightRadius: '1px',
    borderBottomRightRadius: '1px',
    borderBottomLeftRadius: '1px',
    flex: '1',
  },
  sidePanel: {
    backgroundColor: accent['--t-accent-accent7'],
    borderTopLeftRadius: '1px',
    borderTopRightRadius: '1px',
    borderBottomRightRadius: '1px',
    borderBottomLeftRadius: '1px',
    width: '6px',
  },
  fullPage: {
    alignItems: 'center',
    backgroundColor: accent['--t-accent-accent7'],
    borderTopLeftRadius: '1px',
    borderTopRightRadius: '1px',
    borderBottomRightRadius: '1px',
    borderBottomLeftRadius: '1px',
    color: font['--t-font-color-inverted'],
    display: 'flex',
    flex: '1',
    justifyContent: 'center',
    minHeight: '0',
  },
});

const StyledPreviewCanvas = styled.div`
  background-color: ${themeCssVariables.background.secondary};
  border-radius: 2px;
  display: flex;
  flex: 1;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
  padding: 2px;
`;

const StyledMemberPreferenceCanvas = styled(StyledPreviewCanvas)`
  flex-direction: column;
  position: relative;
`;

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
        <StyledMemberPreferenceCanvas>
          <SidePanelPreview />
          <div {...stylex.props(styles.fullPage)} />
          <div {...stylex.props(styles.memberPreferenceIcon)}>
            <IconUserCircle size={14} />
          </div>
        </StyledMemberPreferenceCanvas>
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.previewFrame)}>
      <StyledPreviewCanvas>
        {type === 'side-panel' ? (
          <SidePanelPreview />
        ) : (
          <div {...stylex.props(styles.fullPage)}>
            <IconArrowsDiagonal size={14} />
          </div>
        )}
      </StyledPreviewCanvas>
    </div>
  );
};
