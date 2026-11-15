import { useFileUpload } from '@/file-upload/hooks/useFileUpload';
import { AttachmentChip } from '@/file/components/AttachmentChip';
import { VariableChip } from '@/object-record/record-field/ui/form-types/components/VariableChip';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { useUploadWorkflowFile } from '@/workflow/workflow-steps/workflow-actions/hooks/useUploadWorkflowFile';

import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isString } from '@sniptt/guards';
import { useId } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { type WorkflowEmailFiles } from 'twenty-shared/workflow';
import { IconUpload } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing, font } from 'twenty-ui/theme/tokens.stylex';

type WorkflowSendEmailAttachmentsProps = {
  files: WorkflowEmailFiles;
  onChange: (files: WorkflowEmailFiles) => void;
  label?: string;
  readonly?: boolean;
  VariablePicker?: VariablePickerComponent;
};

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
  },
  chipsContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['--t-spacing-1'],
  },
  variableChipWrapper: {
    display: 'inline-flex',
  },
  uploadAreaLabel: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    justifyContent: 'center',
  },
});

const StyledUploadArea = styled.div<{ hasFiles: boolean; hasPicker: boolean }>`
  background-color: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-bottom-left-radius: ${themeCssVariables.border.radius.sm};
  border-bottom-right-radius: ${({ hasPicker }) =>
    hasPicker ? '0' : themeCssVariables.border.radius.sm};
  border-right: ${({ hasPicker }) =>
    hasPicker ? 'none' : `1px solid ${themeCssVariables.border.color.medium}`};
  border-top-left-radius: ${themeCssVariables.border.radius.sm};
  border-top-right-radius: ${({ hasPicker }) =>
    hasPicker ? '0' : themeCssVariables.border.radius.sm};
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-height: ${({ hasFiles }) => (hasFiles ? 'auto' : '24px')};
  padding-bottom: ${themeCssVariables.spacing[1]};
  padding-left: ${themeCssVariables.spacing[2]};
  padding-right: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[1]};

  &:hover {
    background-color: ${themeCssVariables.background.transparent.light};
    border-color: ${themeCssVariables.border.color.strong};
  }
`;

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
        <StyledUploadArea
          hasFiles={files.length > 0}
          hasPicker={hasPicker}
          onClick={handleAddFileClick}
        >
          {files.length > 0 ? (
            <div {...stylex.props(styles.chipsContainer)}>
              {files.map((file, index) =>
                isString(file) ? (
                  <span
                    key={index}
                    onClick={(event) => event.stopPropagation()} {...stylex.props(styles.variableChipWrapper)}
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
        </StyledUploadArea>

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
