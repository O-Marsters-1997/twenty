import { getCommandMenuItemProgressLabel } from '@/command-menu-item/utils/getCommandMenuItemProgressLabel';
import { isDefined } from 'twenty-shared/utils';
import { Loader } from 'twenty-ui/primitives/feedback';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
  },
  progressText: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    whiteSpace: 'nowrap',
  },
});

export const CommandListItemLoader = ({ progress }: { progress?: number }) => {
  if (!isDefined(progress)) {
    return <Loader />;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <span {...stylex.props(styles.progressText)}>
        {getCommandMenuItemProgressLabel(progress)}
      </span>
      <Loader />
    </div>
  );
};
