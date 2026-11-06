import { type UploadedFileReference } from 'src/engine/metadata-modules/ai/ai-chat/types/uploaded-file-reference.type';

export const buildUploadedFilesSection = ({
  uploadedFiles,
}: {
  uploadedFiles: UploadedFileReference[];
}): string => {
  const uploadedFilesJson = JSON.stringify(
    uploadedFiles.map((f) => ({ filename: f.filename, fileId: f.fileId })),
  );

  const sectionParts = [
    `
## Uploaded Files

The user has uploaded the following files in this conversation:
\`\`\`json
${uploadedFilesJson}
\`\`\`

To store an uploaded file on a record, put it directly in a files-type field value when creating or updating a single record: set the field to an array of \`{ "fileId": "<uploaded fileId>", "label": "<filename>" }\` entries. For example, to attach a document to a person, create an \`attachment\` record with \`file\` set that way and \`targetPersonId\` set. The file is copied automatically and the stored record references the copy's fileId. When updating an existing record, append the new entry to the field's current value: files missing from the new value are detached from the record.`,
  ];

  return sectionParts.join('\n');
};
