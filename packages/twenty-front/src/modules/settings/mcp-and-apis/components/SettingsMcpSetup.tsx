import { t } from '@lingui/core/macro';
import { Fragment } from 'react';

import { LightCopyIconButton } from '@/ui/input/components/LightCopyIconButton';
import ModelContextProtocolLogo from '@/settings/mcp-and-apis/assets/model-context-protocol-logo.svg?react';
import { SettingsMcpSetupCard } from '@/settings/mcp-and-apis/components/SettingsMcpSetupCard';
import { buildMcpSetupCategories } from '@/settings/mcp-and-apis/utils/buildMcpSetupCategories';
import {
  buildMcpConfig,
  buildMcpServerUrl,
  isHttpsUrl,
} from '@/settings/mcp-and-apis/utils/mcpSetup';
import { Section } from 'twenty-ui/components/layout';
import { CodeEditor, CodeEditorHeader } from 'twenty-ui/components/code-editor';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import * as stylex from '@stylexjs/stylex';
import { iconSize, spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  mcpEditorHeaderTitle: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
  },
  mcpSetupContainer: {
    gap: spacing['--t-spacing-10'],
    display: 'flex',
    flexDirection: 'column',
  },
  cardsGrid: {
    gap: spacing['--t-spacing-3'],
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(2, minmax(0, 1fr))',
      [media.mobile]: '1fr',
    },
  },
  mcpIcon: {
    color: 'inherit',
    flexShrink: 0,
    height: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    width: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
  },
});

export const SettingsMcpSetup = () => {
  const mcpServerUrl = buildMcpServerUrl(REACT_APP_SERVER_BASE_URL);
  const mcpConfig = buildMcpConfig(mcpServerUrl);
  const categories = buildMcpSetupCategories({
    isHttpsInstallLinkEnabled: isHttpsUrl(mcpServerUrl),
    mcpServerUrl,
  });

  return (
    <div {...stylex.props(styles.mcpSetupContainer)}>
      {categories.map((category) => (
        <Fragment key={category.title}>
          <Section.Root>
            <Section.Header
              title={category.title}
              description={category.description}
            />
            <div {...stylex.props(styles.cardsGrid)}>
              {category.cards.map((card) => (
                <SettingsMcpSetupCard key={card.title} card={card} />
              ))}
            </div>
          </Section.Root>

          {category.showManualConfigurationAfter && (
            <Section.Root>
              <Section.Header
                title={t`Manual configuration`}
                description={t`Access your workspace data from your favorite MCP client like Claude, Codex or Cursor.`}
              />
              <CodeEditorHeader
                startElement={
                  <div {...stylex.props(styles.mcpEditorHeaderTitle)}>
                    <ModelContextProtocolLogo
                      aria-hidden
                      {...stylex.props(styles.mcpIcon)}
                    />
                    <span>{t`MCP client configuration`}</span>
                  </div>
                }
                endElement={<LightCopyIconButton copyText={mcpConfig} />}
              />
              <CodeEditor
                value={mcpConfig}
                language="json"
                variant="with-header"
                contentPadding="comfortable"
                autoHeight
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  lineNumbers: 'off',
                  lineNumbersMinChars: 0,
                  folding: false,
                  glyphMargin: false,
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'none',
                  wordWrap: 'on',
                }}
              />
            </Section.Root>
          )}
        </Fragment>
      ))}
    </div>
  );
};
