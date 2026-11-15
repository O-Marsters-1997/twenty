import { UnavailableFilePreview } from '@/activities/files/components/UnavailableFilePreview';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  video: {
    height: '100%',
    objectFit: 'contain',
    width: '100%',
  },
});

type VideoPreviewProps = {
  videoName: string;
  videoUrl: string;
};

export const VideoPreview = ({ videoName, videoUrl }: VideoPreviewProps) => {
  const [hasFailedToLoad, setHasFailedToLoad] = useState(false);

  if (hasFailedToLoad) {
    return (
      <UnavailableFilePreview
        fileName={videoName}
        fileUrl={videoUrl}
        message={
          <Trans>
            This video could not be loaded. Please download the file to view it.
          </Trans>
        }
      />
    );
  }

  return (
    <video
      controls
      src={videoUrl}
      onError={() => setHasFailedToLoad(true)}
      {...stylex.props(styles.video)}
    />
  );
};
