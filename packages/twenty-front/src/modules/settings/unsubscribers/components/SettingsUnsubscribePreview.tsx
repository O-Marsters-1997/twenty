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
import { UnsubscribeTopicVisibility } from '~/generated-metadata/graphql';
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
  viewport: {
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'flex',
    justifyContent: 'center',
    paddingBlock: spacing['--t-spacing-10'],
    paddingInline: spacing['--t-spacing-6'],
  },
  card: {
    '--card-background-color': background['--t-background-primary'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-5'],
    maxWidth: '420px',
    padding: spacing['--t-spacing-8'],
    width: '100%',
  },
  header: {
    textAlign: 'center',
  },
  topics: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
  },
  topicRow: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    gap: spacing['--t-spacing-2'],
  },
  trackingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    textAlign: 'left',
  },
  trackingTitle: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  trackingHint: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
});

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
          <Card.Root rounded {...stylex.props(styles.card)}>
            <div {...stylex.props(styles.header)}>
              <Section.Header
                title={t`Do you want to unsubscribe?`}
                description={t`Confirm your preferences:`}
                size="lg"
              />
            </div>
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
              <span
                {...stylex.props(styles.trackingTitle)}
              >{t`Email tracking`}</span>
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
          </Card.Root>
        )}
      </div>
    </Section.Root>
  );
};
