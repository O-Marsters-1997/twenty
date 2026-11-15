import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { useIcons } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';

import { DEFAULT_SKILL_ICON } from '@/skill-suggestion/constants/DefaultSkillIcon';
import { SKILL_SUGGESTION_PREVIEW_WIDTH } from '@/skill-suggestion/constants/SkillSuggestionPreviewWidth';
import type { SkillSuggestionItem } from '@/skill-suggestion/types/SkillSuggestionItem';
import * as stylex from '@stylexjs/stylex';
import { borderColor, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const StyledCard = styled.div`
  background: ${themeCssVariables.background.primary};
  border-radius: ${themeCssVariables.border.radius.md};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: ${SKILL_SUGGESTION_PREVIEW_WIDTH}px;
`;

const styles = stylex.create({
  header: {
    alignItems: 'center',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-2'],
    height: '40px',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-3'],
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
    lineHeight: '1.5',
    maxHeight: 'calc(50dvh / var(--t-zoom, 1))',
    overflowY: 'auto',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    whiteSpace: 'pre-wrap',
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
    <StyledCard>
      <div {...stylex.props(styles.header)}>
        <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
        <div {...stylex.props(styles.titleText)}>{skill.label}</div>
        <span {...stylex.props(styles.name)}>/{skill.name}</span>
      </div>
      {isNonEmptyString(skill.description) && (
        <div {...stylex.props(styles.description)}>{skill.description}</div>
      )}
    </StyledCard>
  );
};
