import * as stylex from '@stylexjs/stylex';
import { type ApplicationDisplayData } from '@/applications/types/ApplicationDisplayData';
import { AppChip } from '@/applications/components/AppChip';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

type ApplicationDisplayProps = {
  application?: ApplicationDisplayData;
};

const styles = stylex.create({
  appChip: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    gap: spacing['--t-spacing-2'],
  },
});

export const ApplicationDisplay = ({
  application,
}: ApplicationDisplayProps) => {
  return (
    <AppChip
      xstyle={styles.appChip}
      size="md"
      applicationId={application?.id}
      logoUrl={application?.logoUrl}
      fallbackApplicationData={{
        name: application?.name,
      }}
    />
  );
};
