import Editor, { loader, type Monaco } from '@monaco-editor/react';
import { isNumber } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { type editor } from 'monaco-editor';
import { type KeyboardEvent, useId, useState } from 'react';

import { Loader } from '@ui/primitives/feedback/Loader/Loader';
import { ResizeHandle } from '@ui/primitives/layout/ResizeHandle/ResizeHandle';
import { useTheme, useThemeColorScheme } from '@ui/theme';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { isDefined } from '@ui/utilities/utils/isDefined';

import '../../../third-party-styles/monaco.css';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
} from '../../../theme/tokens.stylex';

import { BASE_CODE_EDITOR_THEME_ID } from './internal/constants/BaseCodeEditorThemeId';
import { CODE_EDITOR_DEFAULT_HEIGHT } from './internal/constants/CodeEditorDefaultHeight';
import { CodeEditorAutoHeightEffect } from './internal/CodeEditorAutoHeightEffect';
import { CodeEditorLifecycleEffect } from './internal/CodeEditorLifecycleEffect';
import { CodeEditorLoaderConfigurationEffect } from './internal/CodeEditorLoaderConfigurationEffect';
import { CodeEditorMarkersEffect } from './internal/CodeEditorMarkersEffect';
import { CodeEditorResizableHeightEffect } from './internal/CodeEditorResizableHeightEffect';
import { CodeEditorThemeEffect } from './internal/CodeEditorThemeEffect';
import { useCodeEditorHeight } from './internal/useCodeEditorHeight';
import { defineCodeEditorDefaultTheme } from './internal/utils/defineCodeEditorDefaultTheme';
import { type CodeEditorProps } from './types/CodeEditorProps';

// Left alone, `@monaco-editor/loader` downloads Monaco from a CDN at runtime,
// which puts a second Monaco — pinned to a different version than the one we
// bundle — on the page next to the one GraphiQL uses. The two then fight over
// the single global `MonacoEnvironment` and end up talking to each other's
// workers over an incompatible protocol. Point the loader at the bundled
// instance so there is exactly one Monaco (and one that also works offline /
// in self-hosted deployments, unlike the CDN).
//
// The import stays dynamic so Monaco is still only fetched when a code editor
// is actually rendered, instead of weighing down every chunk importing this
// component.
//
// Contract: the bundled ESM Monaco (unlike the CDN AMD build) resolves its
// language workers through `globalThis.MonacoEnvironment`, which the host app
// must set up before an editor mounts — worker wiring is bundler-specific, so
// it can't live in this library. twenty-front does this in
// `src/modules/app/utils/setupMonacoEnvironment.ts`; without it, language
// services (validation, intellisense) are silently unavailable.
let monacoLoaderConfiguration: Promise<void> | undefined;

const configureMonacoLoader = () => {
  monacoLoaderConfiguration ??= import('monaco-editor').then((monaco) => {
    loader.config({ monaco });
  });

  return monacoLoaderConfiguration;
};

export const CodeEditor = ({
  onMount,
  beforeMount,
  setMarkers,
  height = CODE_EDITOR_DEFAULT_HEIGHT,
  width = '100%',
  theme: requestedTheme,
  loading = <Loader />,
  variant = 'default',
  transparentBackground,
  isLoading = false,
  options,
  resizable = false,
  resizeLabel = 'Resize editor',
  contentPadding = 'default',
  autoHeight = false,
  containerProps,
  ref,
  ...editorProps
}: CodeEditorProps) => {
  const theme = useTheme();
  const colorScheme = useThemeColorScheme();
  const [monaco, setMonaco] = useState<Monaco>();
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>();
  const [isMonacoLoaderConfigured, setIsMonacoLoaderConfigured] =
    useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const editorContainerId = useId();
  const editorTheme =
    requestedTheme ?? options?.theme ?? BASE_CODE_EDITOR_THEME_ID;
  const {
    currentHeight,
    resizableHeight,
    setResizableHeight,
    setResizedHeight,
    setContentHeight,
    shouldAutoHeight,
  } = useCodeEditorHeight({ height, resizable, autoHeight });
  const codeEditorPadding = isNumber(theme.spacingMultiplicator)
    ? theme.spacingMultiplicator * 4
    : undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    containerProps?.onKeyDown?.(event);

    if (isEditorFocused) {
      event.stopPropagation();
    }
  };

  return (
    <div
      role="group"
      // oxlint-disable-next-line react/jsx-props-no-spreading
      {...containerProps}
      ref={ref}
      {...mergeStylexProps(
        stylex.props(styles.container),
        containerProps?.className,
      )}
      onKeyDown={handleKeyDown}
    >
      <CodeEditorLoaderConfigurationEffect
        configureMonacoLoader={configureMonacoLoader}
        setIsMonacoLoaderConfigured={setIsMonacoLoaderConfigured}
      />
      <CodeEditorResizableHeightEffect
        height={height}
        resizable={resizable}
        editor={editor}
        setResizedHeight={setResizedHeight}
      />
      <CodeEditorAutoHeightEffect
        shouldAutoHeight={shouldAutoHeight}
        editor={editor}
        setContentHeight={setContentHeight}
      />
      <CodeEditorLifecycleEffect
        editor={editor}
        setEditor={setEditor}
        setMonaco={setMonaco}
        setIsEditorFocused={setIsEditorFocused}
      />
      <CodeEditorMarkersEffect
        editor={editor}
        monaco={monaco}
        setMarkers={setMarkers}
      />
      <CodeEditorThemeEffect
        monaco={monaco}
        theme={theme}
        colorScheme={colorScheme}
        editorTheme={editorTheme}
      />
      {isLoading || !isMonacoLoaderConfigured ? (
        <div
          {...stylex.props(
            styles.editorLoader,
            variant === 'default' && styles.editorLoaderDefault,
            variant === 'with-header' && styles.editorLoaderWithHeader,
            styles.editorLoaderSize(width, currentHeight),
          )}
          data-variant={variant}
        >
          {loading}
        </div>
      ) : (
        <div
          id={editorContainerId}
          {...stylex.props(styles.editorWrapper)}
          data-code-editor=""
          data-variant={variant}
          data-transparent-background={transparentBackground || undefined}
        >
          <Editor
            // oxlint-disable-next-line react/jsx-props-no-spreading
            {...editorProps}
            height={currentHeight}
            width={width}
            theme={editorTheme}
            loading={loading}
            beforeMount={(monaco) => {
              defineCodeEditorDefaultTheme({ monaco, theme, colorScheme });
              beforeMount?.(monaco);
            }}
            onMount={(editor, monaco) => {
              setMonaco(monaco);
              setEditor(editor);
              onMount?.(editor, monaco);
            }}
            options={{
              formatOnPaste: true,
              formatOnType: true,
              fontFamily: theme.code.font.family,
              bracketPairColorization: { enabled: false },
              overviewRulerLanes: 0,
              scrollBeyondLastLine: false,
              scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
              minimap: { enabled: false },
              ...(contentPadding === 'comfortable'
                ? { lineDecorationsWidth: codeEditorPadding }
                : {}),
              padding: { bottom: codeEditorPadding, top: codeEditorPadding },
              ...options,
              theme: editorTheme,
            }}
          />
        </div>
      )}
      {resizable && !isLoading && isDefined(editor) && (
        <ResizeHandle
          aria-label={resizeLabel}
          aria-controls={editorContainerId}
          value={resizableHeight}
          onValueChange={setResizableHeight}
        />
      )}
    </div>
  );
};

const styles = stylex.create({
  container: { display: 'contents' },
  editorWrapper: { display: 'contents' },
  editorLoader: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderRadius: 0,
    borderStyle: 'none',
    display: 'flex',
    justifyContent: 'center',
  },
  editorLoaderDefault: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
  },
  editorLoaderWithHeader: {
    borderColor: borderColor['--t-border-color-medium'],
    borderEndEndRadius: borderRadius['--t-border-radius-md'],
    borderEndStartRadius: borderRadius['--t-border-radius-md'],
    borderStartEndRadius: 0,
    borderStartStartRadius: 0,
    borderStyle: 'solid',
    borderWidth: 1,
    borderBlockStartWidth: 0,
  },
  editorLoaderSize: (
    inlineSize: string | number,
    blockSize: string | number,
  ) => ({
    blockSize,
    inlineSize,
  }),
});
