import { useRender } from '@base-ui/react/use-render';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { type ChangeEvent, useId, useRef } from 'react';

import { IconTrash, IconUpload, IconX } from '@ui/icon';
import { Button } from '@ui/primitives/input/Button/Button';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { focusStyles } from '../../../styles/focus.stylex';
import { media } from '../../../theme/constants.stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from '../../../theme/tokens.stylex';
import { imageInputPreviewMarker } from './ImageInput.stylex';
import { ImageInputPreview } from './internal/ImageInputPreview';
import { type ImageInputProps } from './types/ImageInputProps';

const DEFAULT_IMAGE_ACCEPT = 'image/*';

export const ImageInput = ({
  src,
  onFileSelect,
  onRemove,
  onAbort,
  disabled = false,
  isUploading = false,
  helperText,
  errorMessage,
  uploadLabel = 'Upload',
  removeLabel = 'Remove',
  abortLabel = 'Abort',
  accept = DEFAULT_IMAGE_ACCEPT,
  inputRef,
  onChange,
  'aria-describedby': ariaDescribedBy,
  className,
  style,
  dir,
  render,
  ref,
  ...inputProps
}: ImageInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergedFileInputRef = useMergedRefs(fileInputRef, inputRef);
  const descriptionId = useId();
  const helperTextId = `${descriptionId}-helper`;
  const errorMessageId = `${descriptionId}-error`;
  const hasPicture = isNonEmptyString(src);
  const hasHelperText = isNonEmptyString(helperText);
  const hasErrorMessage = isNonEmptyString(errorMessage);
  const isSelectionUnavailable = disabled || !isDefined(onFileSelect);
  const isRemovalUnavailable = disabled || !hasPicture || !isDefined(onRemove);
  const isUploadDisabled = isSelectionUnavailable || isUploading;
  const isRemoveDisabled = isRemovalUnavailable || isUploading;
  const showAbort = isUploading && isDefined(onAbort);
  const describedBy =
    [
      ariaDescribedBy,
      hasHelperText && helperTextId,
      hasErrorMessage && errorMessageId,
    ]
      .filter(isNonEmptyString)
      .join(' ') || undefined;

  const openFilePicker = () => {
    if (isUploadDisabled) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

    try {
      onChange?.(event);
    } finally {
      event.currentTarget.value = '';
    }

    if (isUploadDisabled || !isDefined(file)) {
      return;
    }

    onFileSelect?.(file);
  };

  return useRender({
    render,
    ref,
    props: {
      ...mergeStylexProps(stylex.props(styles.root), className),
      style,
      dir,
      'aria-busy': isUploading || inputProps['aria-busy'],
      children: (
        <>
          <button
            {...stylex.props(
              imageInputPreviewMarker,
              focusStyles.ring,
              styles.preview,
              hasPicture && styles.previewWithPicture,
            )}
            type="button"
            disabled={isSelectionUnavailable}
            aria-disabled={isUploading || undefined}
            aria-label={uploadLabel}
            aria-describedby={describedBy}
            onClick={openFilePicker}
          >
            <ImageInputPreview key={src} src={src} />
          </button>
          <div {...stylex.props(styles.content)}>
            <div {...stylex.props(styles.actions)}>
              <input
                aria-label={uploadLabel}
                {...inputProps}
                ref={mergedFileInputRef}
                {...stylex.props(styles.fileInput)}
                dir={dir}
                children={undefined}
                dangerouslySetInnerHTML={undefined}
                type="file"
                multiple={false}
                value={undefined}
                defaultValue={undefined}
                accept={accept}
                disabled={isUploadDisabled}
                aria-describedby={describedBy}
                hidden
                onChange={handleFileChange}
              />
              {showAbort ? (
                <Button
                  type="button"
                  startIcon={<IconX />}
                  onClick={onAbort}
                  disabled={disabled}
                  variant="outline"
                >
                  {abortLabel}
                </Button>
              ) : (
                <Button
                  type="button"
                  startIcon={<IconUpload />}
                  onClick={openFilePicker}
                  disabled={isUploadDisabled}
                  focusableWhenDisabled={isUploading && !isSelectionUnavailable}
                  aria-describedby={describedBy}
                  variant="outline"
                >
                  {uploadLabel}
                </Button>
              )}
              <Button
                type="button"
                startIcon={<IconTrash />}
                onClick={onRemove}
                disabled={isRemoveDisabled}
                focusableWhenDisabled={isUploading && !isRemovalUnavailable}
                variant="outline"
              >
                {removeLabel}
              </Button>
            </div>
            {hasHelperText && (
              <span {...stylex.props(styles.helperText)} id={helperTextId}>
                {helperText}
              </span>
            )}
            {hasErrorMessage && (
              <span
                {...stylex.props(styles.errorMessage)}
                id={errorMessageId}
                role="alert"
              >
                {errorMessage}
              </span>
            )}
          </div>
        </>
      ),
    },
  });
};

const unavailable = ':is(:disabled, [aria-disabled="true"])';

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'row' },
  preview: {
    alignItems: 'center',
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      [unavailable]: background['--t-background-secondary'],
      [`:hover:not(${unavailable})`]: {
        default: null,
        [media.hoverCapable]:
          backgroundTransparent['--t-background-transparent-medium'],
      },
    },
    blockSize: 66,
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'content-box',
    color: fontColor['--t-font-color-light'],
    cursor: { default: 'pointer', [unavailable]: 'not-allowed' },
    display: 'flex',
    flexShrink: 0,
    inlineSize: 66,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 0,
    transition: {
      default: 'background 0.1s ease',
      [media.reducedMotion]: 'none',
    },
  },
  previewWithPicture: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      [unavailable]: background['--t-background-secondary'],
      [`:hover:not(${unavailable})`]: {
        default: null,
        [media.hoverCapable]: 'transparent',
      },
    },
  },
  fileInput: { display: 'none' },
  content: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
    justifyContent: 'start',
    marginInlineStart: spacing['--t-spacing-4'],
  },
  actions: {
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-2'],
  },
  helperText: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
  },
  errorMessage: {
    color: fontColor['--t-font-color-danger'],
    fontSize: fontSize['--t-font-size-xs'],
    marginBlockStart: spacing['--t-spacing-1'],
  },
});
