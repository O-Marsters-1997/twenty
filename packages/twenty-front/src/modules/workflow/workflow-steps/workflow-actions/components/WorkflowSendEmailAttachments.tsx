import { useFileUpload } from '@/file-upload/hooks/useFileUpload';
import { AttachmentChip } from '@/file/components/AttachmentChip';
import { VariableChip } from '@/object-record/record-field/ui/form-types/components/VariableChip';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { useUploadWorkflowFile } from '@/workflow/workflow-steps/workflow-actions/hooks/useUploadWorkflowFile';

import { useLingui } from '@lingui/react/macro';
import { isString } from '@sniptt/guards';
import { useId } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { type WorkflowEmailFiles } from 'twenty-shared/workflow';
import { IconUpload } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

type WorkflowSendEmailAttachmentsProps = {
  files: WorkflowEmailFiles;
  onChange: (files: WorkflowEmailFiles) => void;
  label?: string;
  readonly?: boolean;
  VariablePicker?: VariablePickerComponent;
};

const styles = stylex.create({
  uploadArea: {
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':hover': borderColor['--t-border-color-strong'],
    },
    borderStyle: 'solid',
    borderWidth: '1px',
    flex: 1,
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    minHeight: '24px',
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-1'],
  },
  uploadAreaWithFiles: { minHeight: 'auto' },
  uploadAreaWithPicker: {
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
    borderTopRightRadius: 0,
  },

  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
  },
  chipsContainer: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  variableChipWrapper: {
    display: 'inline-flex',
  },
  uploadAreaLabel: {
    gap: spacing['--t-spacing-1'],
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: 'center',
  },
});

export const WorkflowSendEmailAttachments = ({
  files,
  label,
  onChange,
  readonly,
  VariablePicker,
}: WorkflowSendEmailAttachmentsProps) => {
  const instanceId = useId();
  const theme = useTheme();
  const { uploadWorkflowFile } = useUploadWorkflowFile();
  const { openFileUpload } = useFileUpload();
  const { t } = useLingui();

  const handleUploadFiles = async (filesToUpload: File[]) => {
    const uploadedFiles = await Promise.all(
      filesToUpload.map((file) => uploadWorkflowFile(file)),
    );

    const successfulUploads = uploadedFiles.filter(isDefined);

    if (successfulUploads.length > 0) {
      onChange([...files, ...successfulUploads]);
    }
  };

  const handleAddFileClick = () => {
    if (readonly) {
      return;
    }

    openFileUpload({
      multiple: true,
      onUpload: handleUploadFiles,
    });
  };

  const handleAddVariable = (variableName: string) => {
    onChange([...files, variableName]);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    onChange(files.filter((_, index) => index !== indexToRemove));
  };

  const hasPicker = isDefined(VariablePicker) && !readonly;

  return (
    <div {...stylex.props(styles.container)}>
      {label ? <InputLabel>{label}</InputLabel> : null}

      <div {...stylex.props(styles.row)}>
        <div
          {...stylex.props(
            styles.uploadArea,
            files.length > 0 && styles.uploadAreaWithFiles,
            hasPicker && styles.uploadAreaWithPicker,
          )}
          onClick={handleAddFileClick}
        >
          {files.length > 0 ? (
            <div {...stylex.props(styles.chipsContainer)}>
              {files.map((file, index) =>
                isString(file) ? (
                  <span
                    key={index}
                    onClick={(event) => event.stopPropagation()}
                    {...stylex.props(styles.variableChipWrapper)}
                  >
                    <VariableChip
                      rawVariableName={file}
                      onRemove={
                        readonly ? undefined : () => handleRemoveItem(index)
                      }
                    />
                  </span>
                ) : (
                  <AttachmentChip
                    key={index}
                    file={file}
                    onRemove={() => handleRemoveItem(index)}
                    readonly={readonly}
                  />
                ),
              )}
            </div>
          ) : (
            <div {...stylex.props(styles.uploadAreaLabel)}>
              <IconUpload size={theme.icon.size.sm} />
              <span>{t`Upload file`}</span>
            </div>
          )}
        </div>

        {hasPicker ? (
          <VariablePicker
            instanceId={instanceId}
            onVariableSelect={handleAddVariable}
          />
        ) : null}
      </div>
    </div>
  );
};
