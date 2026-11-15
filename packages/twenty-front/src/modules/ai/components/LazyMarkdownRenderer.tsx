import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { MarkdownRenderer } from '@/ai/components/MarkdownRenderer';
import { EMPTY_MARKDOWN_BLOCK_SPLIT_CACHE } from '@/ai/constants/EmptyMarkdownBlockSplitCache';
import { getMarkdownBlocksIncrementally } from '@/ai/utils/getMarkdownBlocksIncrementally';
import { protectChatReferencesForMarkdown } from '@/ai/utils/protectChatReferencesForMarkdown';
import { memo, Suspense, useRef } from 'react';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { themeCssVariables } from 'twenty-ui/theme';
import '~/third-party-styles/markdown.css';

export const MarkdownLoadingSkeleton = () => {
  return (
    <div className="markdown-skeleton">
      <SkeletonLine
        borderRadius={themeCssVariables.border.radius.smRound}
        width={200}
        height={SKELETON_HEIGHT_SIZES.s}
      />
    </div>
  );
};

// Memoized per block so only the streaming tail re-parses references on each flush.
const MemoizedMarkdownBlock = memo(
  ({ blockText, noImage }: { blockText: string; noImage?: boolean }) => (
    <MarkdownRenderer noImage={noImage}>
      {protectChatReferencesForMarkdown(blockText)}
    </MarkdownRenderer>
  ),
);

type LazyMarkdownContentProps = {
  text: string;
  noImage?: boolean;
};

export const LazyMarkdownContent = ({
  text,
  noImage,
}: LazyMarkdownContentProps) => {
  // Not state: only caches the previous split so streaming appends skip settled blocks.
  // oxlint-disable-next-line twenty/no-state-useref
  const blockSplitCacheRef = useRef(EMPTY_MARKDOWN_BLOCK_SPLIT_CACHE);

  const { blocks: markdownBlocks, cache } = getMarkdownBlocksIncrementally({
    text,
    cache: blockSplitCacheRef.current,
  });

  blockSplitCacheRef.current = cache;

  return (
    <div className="markdown-section" data-replay-ignore-mutations="true">
      {markdownBlocks.map((blockText, blockIndex) => (
        <MemoizedMarkdownBlock
          key={blockIndex}
          blockText={blockText}
          noImage={noImage}
        />
      ))}
    </div>
  );
};

type LazyMarkdownRendererProps = LazyMarkdownContentProps;

export const LazyMarkdownRenderer = ({
  text,
  noImage,
}: LazyMarkdownRendererProps) => (
  <Suspense fallback={<MarkdownLoadingSkeleton />}>
    <LazyMarkdownContent text={text} noImage={noImage} />
  </Suspense>
);
