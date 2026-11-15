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
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-medium'],
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'row',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    justifyContent: 'space-between',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  container: {
    gap: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-1'],
  },
  dialog: {
    backgroundColor: background['--t-background-primary'],
    borderRadius: borderRadius['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    fontFamily: font['--t-font-family'],
    left: '50%',
    maxWidth: '400px',
    overflow: 'hidden',
    padding: spacing['--t-spacing-1'],
    position: 'fixed',
    top: '30%',
    transform: 'translateX(-50%)',
    width: '100%',
    zIndex: 1000,
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
