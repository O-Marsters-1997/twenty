import { FieldInputEventContext } from '@/object-record/record-field/ui/contexts/FieldInputEventContext';
import { useJsonField } from '@/object-record/record-field/ui/meta-types/hooks/useJsonField';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { useListenClickOutside } from '@/ui/utilities/pointer-event/hooks/useListenClickOutside';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useLingui } from '@lingui/react/macro';
import { useContext, useRef, useState } from 'react';
import { Key } from 'ts-key-enum';
import { isDefined } from 'twenty-shared/utils';
import { JsonTree } from 'twenty-ui/components/data-display';
import { IconButton } from 'twenty-ui/components/input';
import { CodeEditor } from 'twenty-ui/components/code-editor';
import { IconPencil } from 'twenty-ui/icon';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const CONTAINER_HEIGHT = 300;

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    height: CONTAINER_HEIGHT,
    overflowY: 'auto',
    position: 'relative',
    width: 400,
  },
  switchModeButtonContainer: {
    position: 'fixed',
    right: spacing['--t-spacing-1'],
    top: spacing['--t-spacing-1'],
  },
  codeEditorContainer: {
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  jsonTreeContainer: {
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    width: 'min-content',
  },
});

export const RawJsonFieldInput = () => {
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();

  const { draftValue, precomputedDraftValue, setDraftValue, fieldDefinition } =
    useJsonField();

  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useAvailableComponentInstanceIdOrThrow(
    RecordFieldComponentInstanceContext,
  );

  const { onEscape, onClickOutside, onTab, onShiftTab } = useContext(
    FieldInputEventContext,
  );

  const [isEditing, setIsEditing] = useState(false);

  const parseJsonField = (
    nextValue: string,
  ): { success: boolean; value?: any } => {
    if (!nextValue) {
      return {
        success: true,
        value: null,
      };
    }

    try {
      return { success: true, value: JSON.parse(nextValue) };
    } catch {
      return { success: false };
    }
  };

  const handleEscape = (newText: string) => {
    const { success, value } = parseJsonField(newText);

    onEscape?.({ newValue: value, skipPersist: !success });
  };

  const handleClickOutside = (
    event: MouseEvent | TouchEvent,
    newText: string,
  ) => {
    const { success, value } = parseJsonField(newText);

    onClickOutside?.({ newValue: value, skipPersist: !success, event });
  };

  const handleTab = (newText: string) => {
    const { success, value } = parseJsonField(newText);

    onTab?.({ newValue: value, skipPersist: !success });
  };

  const handleShiftTab = (newText: string) => {
    const { success, value } = parseJsonField(newText);

    onShiftTab?.({ newValue: value, skipPersist: !success });
  };

  const handleChange = (newText: string | undefined) => {
    if (!isDefined(newText)) {
      return;
    }

    setDraftValue(newText);
  };

  useListenClickOutside({
    refs: [containerRef],
    callback: (event) => {
      handleClickOutside(event, draftValue ?? '');
    },
    listenerId: instanceId,
  });

  useHotkeysOnFocusedElement({
    keys: [Key.Escape],
    callback: () => {
      handleEscape(draftValue ?? '');
    },
    focusId: instanceId,
    dependencies: [handleEscape, draftValue],
  });

  useHotkeysOnFocusedElement({
    keys: ['tab'],
    callback: () => {
      handleTab(draftValue ?? '');
    },
    focusId: instanceId,
    dependencies: [handleTab, draftValue],
  });

  useHotkeysOnFocusedElement({
    keys: ['shift+tab'],
    callback: () => {
      handleShiftTab(draftValue ?? '');
    },
    focusId: instanceId,
    dependencies: [handleShiftTab, draftValue],
  });

  const showEditingButton = fieldDefinition.metadata.isUIEditable ?? true;

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  return (
    <div ref={containerRef} {...stylex.props(styles.container)}>
      {isEditing ? (
        <div {...stylex.props(styles.codeEditorContainer)}>
          <CodeEditor
            value={draftValue}
            language="application/json"
            height={CONTAINER_HEIGHT - 8}
            variant="borderless"
            transparentBackground
            options={{
              lineNumbers: 'off',
              folding: false,
              overviewRulerBorder: false,
              lineDecorationsWidth: 0,
              scrollbar: {
                useShadows: false,
                vertical: 'hidden',
                horizontal: 'hidden',
              },
            }}
            onChange={handleChange}
          />
        </div>
      ) : (
        <>
          {showEditingButton && (
            <div {...stylex.props(styles.switchModeButtonContainer)}>
              <IconButton
                elevated
                size="sm"
                onClick={handleStartEditing}
                aria-label={t`Edit JSON`}
              >
                <IconPencil />
              </IconButton>
            </div>
          )}

          <div {...stylex.props(styles.jsonTreeContainer)}>
            <JsonTree
              value={precomputedDraftValue}
              emptyArrayLabel={t`Empty Array`}
              emptyObjectLabel={t`Empty Object`}
              emptyStringLabel={t`[empty string]`}
              arrowButtonCollapsedLabel={t`Expand`}
              arrowButtonExpandedLabel={t`Collapse`}
              onNodeValueClick={copyToClipboard}
            />
          </div>
        </>
      )}
    </div>
  );
};
