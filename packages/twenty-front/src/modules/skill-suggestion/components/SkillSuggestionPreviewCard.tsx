import { isNonEmptyString } from '@sniptt/guards';
import { useIcons } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { DEFAULT_SKILL_ICON } from '@/skill-suggestion/constants/DefaultSkillIcon';
import { SKILL_SUGGESTION_PREVIEW_WIDTH } from '@/skill-suggestion/constants/SkillSuggestionPreviewWidth';
import type { SkillSuggestionItem } from '@/skill-suggestion/types/SkillSuggestionItem';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  card: (width: number) => ({
    background: background['--t-background-primary'],
    borderRadius: borderRadius['--t-border-radius-md'],
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    width,
  }),
  header: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    height: '40px',
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: '0',
  },
  titleText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  name: {
    color: fontColor['--t-font-color-light'],
    flexShrink: '0',
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  description: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    maxHeight: 'calc(50dvh / var(--t-zoom, 1))',
    overflowY: 'auto',
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
  },
});

type SkillSuggestionPreviewCardProps = {
  skill: SkillSuggestionItem;
};

export const SkillSuggestionPreviewCard = ({
  skill,
}: SkillSuggestionPreviewCardProps) => {
  const theme = useTheme();
  const { getIcon } = useIcons();
  const Icon = getIcon(skill.icon ?? DEFAULT_SKILL_ICON);

  return (
    <div {...stylex.props(styles.card(SKILL_SUGGESTION_PREVIEW_WIDTH))}>
      <div {...stylex.props(styles.header)}>
        <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
        <div {...stylex.props(styles.titleText)}>{skill.label}</div>
        <span {...stylex.props(styles.name)}>/{skill.name}</span>
      </div>
      {isNonEmptyString(skill.description) && (
        <div {...stylex.props(styles.description)}>{skill.description}</div>
      )}
    </div>
  );
};
