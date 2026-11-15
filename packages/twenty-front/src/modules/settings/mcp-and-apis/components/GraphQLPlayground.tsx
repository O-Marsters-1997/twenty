import {
  isPlaygroundApiKeyFresh,
  playgroundApiKeyState,
} from '@/settings/mcp-and-apis/states/playgroundApiKeyState';
import { PlaygroundSchemas } from '@/settings/mcp-and-apis/types/PlaygroundSchemas';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { explorerPlugin } from '@graphiql/plugin-explorer';
import '@graphiql/plugin-explorer/style.css';
import { createGraphiQLFetcher } from '@graphiql/toolkit';
import { GraphiQL } from 'graphiql';
import 'graphiql/style.css';
import '~/third-party-styles/graphiql.css';
import * as stylex from '@stylexjs/stylex';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import { useThemeColorScheme } from 'twenty-ui/theme';

type GraphQLPlaygroundProps = {
  onError(): void;
  schema: PlaygroundSchemas;
};

export const schemaToPath = {
  [PlaygroundSchemas.CORE]: 'graphql',
  [PlaygroundSchemas.METADATA]: 'metadata',
};

const styles = stylex.create({
  container: {
    height: '100%',
    width: '100%',
  },
});

export const GraphQLPlayground = ({
  onError,
  schema,
}: GraphQLPlaygroundProps) => {
  const playgroundApiKey = useAtomStateValue(playgroundApiKeyState);
  const baseUrl = REACT_APP_SERVER_BASE_URL + '/' + schemaToPath[schema];

  const colorScheme = useThemeColorScheme();

  if (!isPlaygroundApiKeyFresh(playgroundApiKey)) {
    onError();
    return null;
  }

  const explorer = explorerPlugin({
    showAttribution: true,
  });

  const fetcher = createGraphiQLFetcher({
    url: baseUrl,
    headers: {
      Authorization: `Bearer ${playgroundApiKey.token}`,
    },
  });

  return (
    <div {...stylex.props(styles.container)}>
      <GraphiQL
        forcedTheme={colorScheme}
        plugins={[explorer]}
        fetcher={fetcher}
        defaultHeaders={JSON.stringify({
          Authorization: `Bearer ${playgroundApiKey.token}`,
        })}
      />
    </div>
  );
};
