import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';

import { useUnsubscribeTopics } from '@/activities/emails/hooks/useUnsubscribeTopics';
import { Section } from 'twenty-ui/components/layout';
import {
  Button,
  Checkbox,
  Radio,
  RadioGroup,
} from 'twenty-ui/primitives/input';
import { LabeledDivider } from '@/ui/layout/line/components/LabeledDivider';
import { Card } from 'twenty-ui/primitives/surfaces';
import { themeCssVariables } from 'twenty-ui/theme';
import { UnsubscribeTopicVisibility } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { background, border, spacing, font } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  viewport: {
    alignItems: 'center',
    background: background['--t-background-secondary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: border['--t-border-color-medium'],
    borderTopLeftRadius: border['--t-border-radius-md'],
    borderTopRightRadius: border['--t-border-radius-md'],
    borderBottomRightRadius: border['--t-border-radius-md'],
    borderBottomLeftRadius: border['--t-border-radius-md'],
    display: 'flex',
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-10'],
    paddingRight: spacing['--t-spacing-6'],
    paddingBottom: spacing['--t-spacing-10'],
    paddingLeft: spacing['--t-spacing-6'],
  },
  topics: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
  },
  topicRow: {
    alignItems: 'center',
    color: font['--t-font-color-primary'],
    display: 'flex',
    fontSize: font['--t-font-size-md'],
    gap: spacing['--t-spacing-2'],
  },
  trackingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    textAlign: 'left',
  },
  trackingTitle: {
    color: font['--t-font-color-primary'],
    fontWeight: font['--t-font-weight-medium'],
  },
  trackingHint: {
    color: font['--t-font-color-secondary'],
    fontSize: font['--t-font-size-sm'],
  },
});

const StyledCard = styled(Card.Root)`
  --card-background-color: ${themeCssVariables.background.primary};

  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
  max-width: 420px;
  padding: ${themeCssVariables.spacing[8]};
  width: 100%;
`;

const StyledHeader = styled.div`
  text-align: center;

  h2 {
    font-size: 20px;
  }
`;

export const SettingsUnsubscribePreview = () => {
  const { t } = useLingui();
  const { unsubscribeTopics, loading } = useUnsubscribeTopics();

  const publicTopics = unsubscribeTopics.filter(
    (topic) => topic.visibility === UnsubscribeTopicVisibility.PUBLIC,
  );

  const hasPublicTopics = publicTopics.length > 0;

  return (
    <Section.Root>
      <Section.Header
        title={t`Unsubscribe page`}
        description={t`Preview of the page recipients see when they unsubscribe`}
      />
      <div {...stylex.props(styles.viewport)}>
        {!loading && (
          <StyledCard rounded>
            <StyledHeader>
              <Section.Header
                title={t`Do you want to unsubscribe?`}
                description={t`Confirm your preferences:`}
              />
            </StyledHeader>
            {hasPublicTopics && (
              <div {...stylex.props(styles.topics)}>
                {publicTopics.map((topic) => (
                  <div key={topic.id} {...stylex.props(styles.topicRow)}>
                    <Checkbox
                      checked
                      onCheckedChange={() => {}}
                      aria-label={topic.name ?? t`Untitled topic`}
                    />
                    {topic.name ?? t`Untitled topic`}
                  </div>
                ))}
              </div>
            )}
            <div {...stylex.props(styles.trackingSection)}>
              <span {...stylex.props(styles.trackingTitle)}>{t`Email tracking`}</span>
              <span {...stylex.props(styles.trackingHint)}>
                {t`This sender records which links you click in its emails. You can opt out for this email address.`}
              </span>
              <RadioGroup
                value="TRACKED"
                onValueChange={() => {}}
                aria-label={t`Email tracking`}
              >
                <div {...stylex.props(styles.topicRow)}>
                  <Radio
                    value="TRACKED"
                    aria-label={t`Keep tracking my clicks`}
                  />
                  {t`Keep tracking my clicks`}
                </div>
                <div {...stylex.props(styles.topicRow)}>
                  <Radio
                    value="OPTED_OUT"
                    aria-label={t`Opt out of click tracking`}
                  />
                  {t`Opt out of click tracking`}
                </div>
              </RadioGroup>
            </div>
            <Button fullWidth variant="solid" color="accent">
              {t`Update`}
            </Button>
            <LabeledDivider noMargin>{t`Or`}</LabeledDivider>
            <Button fullWidth variant="outline">
              {t`Unsubscribe all`}
            </Button>
          </StyledCard>
        )}
      </div>
    </Section.Root>
  );
};
