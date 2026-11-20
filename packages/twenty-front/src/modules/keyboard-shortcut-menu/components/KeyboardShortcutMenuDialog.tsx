import { t } from '@lingui/core/macro';
import { IconButton } from 'twenty-ui/components/input';
import { IconX } from 'twenty-ui/icon';
import { useIsMobile } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  boxShadow,
  font,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  heading: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'row',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    justifyContent: 'space-between',
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
  },
  container: {
    gap: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-1'],
  },
  dialog: {
    padding: spacing['--t-spacing-1'],
    borderRadius: borderRadius['--t-border-radius-md'],
    overflow: 'hidden',
    backgroundColor: background['--t-background-primary'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    fontFamily: font['--t-font-family'],
    position: 'fixed',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    left: '50%',
    maxWidth: '400px',
    top: '30%',
    width: '100%',
  },
  dialogMobile: {
    transform: 'translateX(-49.5%)',
    width: 'calc(100% - 40px)',
  },
});

type KeyboardMenuDialogProps = {
  onClose: () => void;
  children: React.ReactNode | React.ReactNode[];
};

export const KeyboardMenuDialog = ({
  onClose,
  children,
}: KeyboardMenuDialogProps) => {
  const isMobile = useIsMobile();

  return (
    <div {...stylex.props(styles.dialog, isMobile && styles.dialogMobile)}>
      <div {...stylex.props(styles.heading)}>
        {t`Keyboard shortcuts`}
        <IconButton
          aria-label={t`Close keyboard shortcuts`}
          variant="ghost"
          onClick={onClose}
        >
          <IconX />
        </IconButton>
      </div>
      <div {...stylex.props(styles.container)}>{children}</div>
    </div>
  );
};
