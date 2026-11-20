import { SettingsDataModelOverviewEffect } from '@/settings/data-model/graph-overview/components/SettingsDataModelOverviewEffect';
import { SettingsDataModelOverviewObject } from '@/settings/data-model/graph-overview/components/SettingsDataModelOverviewObject';
import { SettingsDataModelOverviewRelationMarkers } from '@/settings/data-model/graph-overview/components/SettingsDataModelOverviewRelationMarkers';
import { calculateHandlePosition } from '@/settings/data-model/graph-overview/utils/calculateHandlePosition';
import { NavigationButton } from '@/ui/input/components/NavigationButton';
import { t } from '@lingui/core/macro';
import {
  Background,
  type Edge,
  type Node,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodesChange,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  getIncomers,
  getOutgoers,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { useCallback, useState } from 'react';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import {
  IconLock,
  IconLockOpen,
  IconMaximize,
  IconMinus,
  IconPlus,
  IconX,
} from 'twenty-ui/icon';
import { ButtonGroup } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import '~/third-party-styles/react-flow.css';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const nodeTypes: NodeTypes = {
  object: SettingsDataModelOverviewObject,
};
const styles = stylex.create({
  container: {
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    zIndex: 5,
    left: spacing['--t-spacing-3'],
    top: spacing['--t-spacing-3'],
  },
});

export const SettingsDataModelOverview = () => {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [isInteractive, setInteractive] = useState(true);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const handleNodesChange: OnNodesChange = useCallback(
    (nodeChanges) => {
      nodeChanges.forEach((nodeChange) => {
        const node = nodes.find(
          (node) => node.id === (nodeChange as { id: string }).id,
        );
        if (!node) {
          return;
        }

        const incomingNodes = getIncomers(node, nodes, edges);
        const newXPos =
          'positionAbsolute' in nodeChange
            ? nodeChange.positionAbsolute?.x
            : node.position.x || 0;

        incomingNodes.forEach((incomingNode) => {
          const edge = edges.find((edge) => {
            return edge.target === node.id && edge.source === incomingNode.id;
          });

          if (isDefined(newXPos)) {
            setEdges((eds) =>
              eds.map((ed) => {
                if (isDefined(edge) && ed.id === edge.id) {
                  const sourcePosition = calculateHandlePosition(
                    incomingNode.width as number,
                    incomingNode.position.x,
                    node.width as number,
                    newXPos,
                    'source',
                  );
                  const targetPosition = calculateHandlePosition(
                    incomingNode.width as number,
                    incomingNode.position.x,
                    node.width as number,
                    newXPos,
                    'target',
                  );
                  const sourceHandle = `${edge.data?.sourceField}-${sourcePosition}`;
                  const targetHandle = `${edge.data?.targetField}-${targetPosition}`;
                  ed.sourceHandle = sourceHandle;
                  ed.targetHandle = targetHandle;
                  ed.markerEnd = 'marker';
                  ed.markerStart = 'marker';
                }

                return ed;
              }),
            );
          }
        });

        const outgoingNodes = getOutgoers(node, nodes, edges);
        outgoingNodes.forEach((targetNode) => {
          const edge = edges.find((edge) => {
            return edge.target === targetNode.id && edge.source === node.id;
          });
          if (isDefined(newXPos)) {
            setEdges((eds) =>
              eds.map((ed) => {
                if (isDefined(edge) && ed.id === edge.id) {
                  const sourcePosition = calculateHandlePosition(
                    node.width as number,
                    newXPos,
                    targetNode.width as number,
                    targetNode.position.x,
                    'source',
                  );
                  const targetPosition = calculateHandlePosition(
                    node.width as number,
                    newXPos,
                    targetNode.width as number,
                    targetNode.position.x,
                    'target',
                  );

                  const sourceHandle = `${edge.data?.sourceField}-${sourcePosition}`;
                  const targetHandle = `${edge.data?.targetField}-${targetPosition}`;

                  ed.sourceHandle = sourceHandle;
                  ed.targetHandle = targetHandle;
                  ed.markerEnd = 'marker';
                  ed.markerStart = 'marker';
                }

                return ed;
              }),
            );
          }
        });
      });

      onNodesChange(nodeChanges);
    },
    [onNodesChange, setEdges, nodes, edges],
  );

  return (
    <div {...stylex.props(styles.container)} data-settings-data-model-overview>
      <div {...stylex.props(styles.closeButton)}>
        <NavigationButton
          startIcon={<IconX />}
          aria-label={t`Close overview`}
          to={getSettingsPath(SettingsPath.Objects)}
        ></NavigationButton>
      </div>
      <SettingsDataModelOverviewEffect
        setEdges={setEdges}
        setNodes={setNodes}
      />
      <SettingsDataModelOverviewRelationMarkers />
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        nodesDraggable={isInteractive}
        elementsSelectable={isInteractive}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <ButtonGroup
          framed
          attached={false}
          className="react-flow__panel bottom left"
          aria-label={t`Diagram controls`}
        >
          <LightIconButton
            size="xs"
            emphasis="subtle"
            aria-label={t`Zoom in`}
            onClick={() => zoomIn()}
          >
            <IconPlus />
          </LightIconButton>
          <LightIconButton
            size="xs"
            emphasis="subtle"
            aria-label={t`Zoom out`}
            onClick={() => zoomOut()}
          >
            <IconMinus />
          </LightIconButton>
          <LightIconButton
            size="xs"
            emphasis="subtle"
            aria-label={t`Fit view`}
            onClick={() => fitView()}
          >
            <IconMaximize />
          </LightIconButton>
          <LightIconButton
            size="xs"
            emphasis="subtle"
            aria-label={t`Lock diagram`}
            aria-pressed={!isInteractive}
            onClick={() => setInteractive(!isInteractive)}
          >
            {isInteractive ? <IconLockOpen /> : <IconLock />}
          </LightIconButton>
        </ButtonGroup>
      </ReactFlow>
    </div>
  );
};
