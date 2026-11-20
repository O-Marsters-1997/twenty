import { downloadFile } from '@/activities/files/utils/downloadFile';
import { Trans, useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { IconDownload } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-4'],
    paddingBlock: spacing['--t-spacing-8'],
    paddingInline: spacing['--t-spacing-8'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-xl'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  message: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-lg'],
    maxWidth: '400px',
  },
});

type UnavailableFilePreviewProps = {
  fileName: string;
  fileUrl: string;
  message: ReactNode;
};

export const UnavailableFilePreview = ({
  fileName,
  fileUrl,
  message,
}: UnavailableFilePreviewProps) => {
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.title)}>
        <Trans>Preview Not Available</Trans>
      </div>
      <div {...stylex.props(styles.message)}>{message}</div>
      <Button
        startIcon={<IconDownload />}
        onClick={() => downloadFile(fileUrl, fileName)}
        variant="outline"
      >{t`Download File`}</Button>
    </div>
  );
};
