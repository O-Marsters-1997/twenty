import { t } from '@lingui/core/macro';

import { AppChip } from '@/applications/components/AppChip';
import { Avatar, Chip } from 'twenty-ui/primitives/data-display';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  chip: {
    paddingInlineStart: 0,
  },
});

type SettingsItemTypeTagProps = {
  item: {
    isRemote?: boolean;
    applicationId?: string | null;
  };
  className?: string;
};

export const SettingsItemTypeTag = ({
  className,
  item: { isRemote, applicationId },
}: SettingsItemTypeTagProps) => {
  if (isDefined(applicationId)) {
    return <AppChip applicationId={applicationId} />;
  } else if (isRemote === true) {
    return (
      <Chip
        className={className}
        variant="ghost"
        color="primary"
        startElement={
          <Avatar
            shape="square"
            variant="outline"
            size="sm"
            name="Remote"
            colorSeed="Remote"
          />
        }
        {...stylex.props(styles.chip)}
      >{t`Remote`}</Chip>
    );
  } else {
    return null;
  }
};
