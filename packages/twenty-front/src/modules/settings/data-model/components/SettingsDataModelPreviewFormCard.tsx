import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

import { StyledFormCardTitle } from '@/settings/data-model/fields/components/StyledFormCardTitle';
import { Trans } from '@lingui/react/macro';
import { Card } from 'twenty-ui/primitives/surfaces';
import { isDefined } from 'twenty-shared/utils';
import { backgroundTransparent } from 'twenty-ui/theme/tokens.stylex';

type SettingsDataModelPreviewFormCardProps = {
  className?: string;
  preview: ReactNode;
  form?: ReactNode;
  disabled?: boolean;
  isPreviewTitleVisible?: boolean;
};

export const SettingsDataModelPreviewFormCard = ({
  className,
  preview,
  form,
  isPreviewTitleVisible = true,
}: SettingsDataModelPreviewFormCardProps) => (
  <Card.Root className={className} fullWidth rounded>
    <Card.Content
      divider={isDefined(form)}
      {...stylex.props(styles.previewContent)}
    >
      {isPreviewTitleVisible && (
        <StyledFormCardTitle>
          <Trans>Preview</Trans>
        </StyledFormCardTitle>
      )}
      {preview}
    </Card.Content>
    {isDefined(form) && (
      <Card.Content {...stylex.props(styles.formContent)}>{form}</Card.Content>
    )}
  </Card.Root>
);

const styles = stylex.create({
  previewContent: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
  },
  formContent: {
    paddingBlock: 0,
    paddingInline: 0,
  },
});
