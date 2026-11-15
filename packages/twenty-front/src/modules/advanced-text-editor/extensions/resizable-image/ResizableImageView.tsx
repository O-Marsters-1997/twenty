import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import React, { useCallback, useRef, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const IMAGE_MIN_WIDTH = 32;
const IMAGE_MAX_WIDTH = 600;

const styles = stylex.create({
  nodeViewWrapperContainer: {
    display: 'flex',
    height: '100%',
  },
  alignLeft: {
    justifyContent: 'flex-start',
  },
  alignCenter: {
    justifyContent: 'center',
  },
  alignRight: {
    justifyContent: 'flex-end',
  },
  imageWrapper: {
    height: '100%',
  },
  imageHandle: {
    backgroundColor: background['--t-background-primary-inverted'],
    borderColor: background['--t-background-primary'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    cursor: 'col-resize',
    height: spacing['--t-spacing-8'],
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: spacing['--t-spacing-2'],
    zIndex: 1,
  },
  imageHandleLeft: {
    left: spacing['--t-spacing-1'],
    right: 'auto',
  },
  imageHandleRight: {
    left: 'auto',
    right: spacing['--t-spacing-1'],
  },
  imageContainer: {
    maxWidth: '100%',
    position: 'relative',
  },
  image: {
    height: 'auto',
    maxWidth: '100%',
  },
});

type ResizeParams = {
  initialWidth: number;
  initialClientX: number;
  handleUsed: 'left' | 'right';
};

type ResizableImageViewProps = NodeViewProps;

export const ResizableImageView = (props: ResizableImageViewProps) => {
  const { editor, node, updateAttributes } = props;
  const { width: initialWidth, align = 'left', src, alt } = node.attrs;

  const imageWrapperRef = useRef<HTMLDivElement>(null);

  const [isHovering, setIsHovering] = useState(false);
  const [width, setWidth] = useState(initialWidth || 0);
  // Controls actual resize operation state (null = not resizing, object = actively resizing)
  const [resizeParams, setResizeParams] = useState<ResizeParams | null>(null);

  const createMouseHandlers = useCallback(() => {
    let currentResizeParams: ResizeParams | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      const imageWrapper = imageWrapperRef.current;

      if (!isDefined(currentResizeParams) || !isDefined(imageWrapper)) {
        return;
      }

      const deltaX = event.clientX - currentResizeParams.initialClientX;
      const { initialWidth, handleUsed } = currentResizeParams;

      let newWidth =
        align === 'center'
          ? initialWidth + (handleUsed === 'left' ? -deltaX * 2 : deltaX * 2)
          : initialWidth + (handleUsed === 'left' ? -deltaX : deltaX);

      const maxWidth =
        editor.view.dom.firstElementChild?.clientWidth || IMAGE_MAX_WIDTH;
      newWidth = Math.min(Math.max(newWidth, IMAGE_MIN_WIDTH), maxWidth);

      setWidth(newWidth);
      imageWrapper.style.width = `${newWidth}px`;
    };

    const handleMouseUp = (event: MouseEvent) => {
      const imageWrapper = imageWrapperRef.current;

      if (!isDefined(imageWrapper) || !isDefined(currentResizeParams)) {
        return;
      }

      if (
        (!event.target || !imageWrapper.contains(event.target as Node)) &&
        isHovering
      ) {
        setIsHovering(false);
        return;
      }

      const finalWidth = imageWrapper.clientWidth;
      currentResizeParams = null;
      setResizeParams(null);
      updateAttributes({ width: finalWidth });

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    const startResize = (resizeParams: ResizeParams) => {
      currentResizeParams = resizeParams;
      setResizeParams(resizeParams);

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    return { startResize };
  }, [editor, align, isHovering, updateAttributes]);

  const { startResize } = createMouseHandlers();

  const handleImageHandleMouseDown = useCallback(
    (handle: 'left' | 'right', event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();

      const resizeParams = {
        initialWidth: imageWrapperRef.current?.clientWidth ?? IMAGE_MAX_WIDTH,
        initialClientX: event.clientX,
        handleUsed: handle,
      };

      startResize(resizeParams);
    },
    [startResize],
  );

  const handleImageHover = useCallback(() => {
    if (!editor.isEditable) {
      return;
    }

    setIsHovering(true);
  }, [editor.isEditable]);

  const handleImageHoverEnd = useCallback(() => {
    setIsHovering(false);
  }, []);

  return (
    <NodeViewWrapper>
      <div
        onMouseEnter={handleImageHover}
        onMouseLeave={handleImageHoverEnd}
        {...stylex.props(
          styles.nodeViewWrapperContainer,
          align === 'center'
            ? styles.alignCenter
            : align === 'right'
              ? styles.alignRight
              : styles.alignLeft,
        )}
      >
        <div
          ref={imageWrapperRef}
          {...stylex.props(styles.imageWrapper)}
          style={{ width: width ? `${width}px` : 'fit-content' }}
        >
          <div {...stylex.props(styles.imageContainer)}>
            <img
              src={src}
              alt={alt}
              draggable={false}
              contentEditable={false}
              {...stylex.props(styles.image)}
            />
            {(isHovering || isDefined(resizeParams)) && (
              <>
                <div
                  onMouseDown={(e) => handleImageHandleMouseDown('left', e)}
                  {...stylex.props(styles.imageHandle, styles.imageHandleLeft)}
                />
                <div
                  onMouseDown={(e) => handleImageHandleMouseDown('right', e)}
                  {...stylex.props(
                    styles.imageHandle,
                    styles.imageHandleRight,
                  )}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};
