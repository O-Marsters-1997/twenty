import { styled } from '@linaria/react';
import React from 'react';

import { getDisplayNameFromParticipant } from '@/activities/emails/utils/getDisplayNameFromParticipant';
import { getEmailParticipantAvatarColorSeed } from '@/activities/emails/utils/getEmailParticipantAvatarColorSeed';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { RecordChip } from '@/object-record/components/RecordChip';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import { Avatar } from 'twenty-ui/primitives/data-display';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  senderName: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  senderNameBold: {
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  avatarContainer: {
    marginRight: spacing['--t-spacing-1'],
  },
  chip: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    height: '20px',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    whiteSpace: 'nowrap',
  },
});

const StyledContainer = styled.div`
  align-items: flex-start;
  display: flex;
`;

type ParticipantChipVariant = 'default' | 'bold';

export const ParticipantChip = ({
  participant,
  variant = 'default',
  className,
}: {
  participant: any;
  variant?: ParticipantChipVariant;
  className?: string;
}) => {
  const { person, workspaceMember } = participant;

  const displayName = getDisplayNameFromParticipant({
    participant,
    shouldUseFullName: true,
  });

  const avatarUrl = person?.avatarUrl ?? workspaceMember?.avatarUrl ?? '';

  return (
    <StyledContainer className={className}>
      {person ? (
        <RecordChip
          objectNameSingular={CoreObjectNameSingular.Person}
          record={person}
          isBold={variant === 'bold'}
        />
      ) : (
        <div {...stylex.props(styles.chip)}>
          <span {...stylex.props(styles.avatarContainer)}>
            <Avatar
              src={getAbsoluteImageUrl(avatarUrl)}
              shape="circle"
              name={displayName}
              colorSeed={getEmailParticipantAvatarColorSeed(participant)}
              size="sm"
            />
          </span>
          <span
            {...stylex.props(
              styles.senderName,
              variant === 'bold' && styles.senderNameBold,
            )}
          >
            {displayName}
          </span>
        </div>
      )}
    </StyledContainer>
  );
};
