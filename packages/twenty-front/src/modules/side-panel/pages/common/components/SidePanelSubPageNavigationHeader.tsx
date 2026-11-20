import { IconChevronLeft } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    height: '40px',
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: '0',
  },
  text: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
});

type SidePanelSubPageNavigationHeaderProps = {
  title: string;
  onBackClick: () => void;
};

export const SidePanelSubPageNavigationHeader = ({
  onBackClick,
  title,
}: SidePanelSubPageNavigationHeaderProps) => {
  return (
    <div {...stylex.props(styles.container)}>
      <IconButton
        onClick={onBackClick}
        variant="ghost"
        size="sm"
        aria-label="Go back"
      >
        <IconChevronLeft />
      </IconButton>
      <span {...stylex.props(styles.text)}>{title}</span>
    </div>
  );
};
