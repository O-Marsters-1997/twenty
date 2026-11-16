import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { RestPlaygroundSchemaFetchEffect } from '@/settings/mcp-and-apis/components/RestPlaygroundSchemaFetchEffect';
import {
  isPlaygroundApiKeyFresh,
  playgroundApiKeyState,
} from '@/settings/mcp-and-apis/states/playgroundApiKeyState';
import { type PlaygroundSchemas } from '@/settings/mcp-and-apis/types/PlaygroundSchemas';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useState, lazy, Suspense } from 'react';
import * as stylex from '@stylexjs/stylex';

import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import { useThemeColorScheme } from 'twenty-ui/theme';
import { borderColor, borderRadius } from 'twenty-ui/theme/tokens.stylex';
import '~/third-party-styles/scalar.css';

const styles = stylex.create({
  container: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    height: '100%',
    overflowY: 'scroll',
    width: '100%',
  },
});

const ApiReferenceReact = lazy(() =>
  import('@scalar/api-reference-react').then((module) => {
    import('@scalar/api-reference-react/style.css');
    return {
      default: module.ApiReferenceReact,
    };
  }),
);

type RestPlaygroundProps = {
  onError(): void;
  schema: PlaygroundSchemas;
};

export const RestPlayground = ({ onError, schema }: RestPlaygroundProps) => {
  const colorScheme = useThemeColorScheme();
  const playgroundApiKey = useAtomStateValue(playgroundApiKeyState);
  const [specContent, setSpecContent] = useState<object | null>(null);

  if (!isPlaygroundApiKeyFresh(playgroundApiKey)) {
    onError();
    return null;
  }

  const fallback = <SkeletonLine width="100%" height="100%" />;

  return (
    <div {...stylex.props(styles.container)}>
      <RestPlaygroundSchemaFetchEffect
        schema={schema}
        apiKey={playgroundApiKey.token}
        onSchemaLoaded={setSpecContent}
        onError={onError}
      />
      {specContent === null ? (
        fallback
      ) : (
        <Suspense fallback={fallback}>
          <ApiReferenceReact
            configuration={{
              content: specContent,
              authentication: {
                preferredSecurityScheme: 'bearerAuth',
                securitySchemes: {
                  bearerAuth: { token: playgroundApiKey.token },
                },
              },
              baseServerURL: REACT_APP_SERVER_BASE_URL + '/' + schema,
              forceDarkModeState: colorScheme === 'dark' ? 'dark' : 'light',
              hideClientButton: true,
              hideDarkModeToggle: true,
              hideModels: schema === 'metadata',
              pathRouting: {
                basePath: getSettingsPath(SettingsPath.RestPlayground, {
                  schema,
                }),
              },
            }}
          />
        </Suspense>
      )}
    </div>
  );
};
