import { WORKFLOW_DIAGRAM_NODE_DEFAULT_TARGET_HANDLE_ID } from '@/workflow/workflow-diagram/workflow-nodes/constants/WorkflowDiagramNodeDefaultTargetHandleId';
import { WorkflowDiagramHandleTargetEffect } from '@/workflow/workflow-diagram/workflow-nodes/components/WorkflowDiagramHandleTargetEffect';
import * as stylex from '@stylexjs/stylex';
import { Handle, Position, useNodeId } from '@xyflow/react';
import { isDefined } from 'twenty-shared/utils';

type WorkflowDiagramHandleTargetProps = {
  isConnectable?: boolean;
  targetHandleIds?: string[];
};

const styles = stylex.create({
  handleContainer: {
    inset: 0,
    position: 'absolute',
  },
  branchHandle: {
    opacity: 0,
    pointerEvents: 'none',
  },
});

export const WorkflowDiagramHandleTarget = ({
  isConnectable = false,
  targetHandleIds,
}: WorkflowDiagramHandleTargetProps) => {
  const nodeId = useNodeId();
  const targetHandlesKey = targetHandleIds?.join(',');

  return (
    <>
      {isDefined(nodeId) && (
        <WorkflowDiagramHandleTargetEffect
          nodeId={nodeId}
          targetHandlesKey={targetHandlesKey}
        />
      )}
      <div data-workflow-handle-target {...stylex.props(styles.handleContainer)}>
        <Handle
          id={WORKFLOW_DIAGRAM_NODE_DEFAULT_TARGET_HANDLE_ID}
          type="target"
          position={Position.Top}
          isConnectableEnd={isConnectable}
          isConnectableStart={false}
        />
      </div>
      {targetHandleIds?.map((handleId, index) => (
        <Handle
          key={handleId}
          className={stylex.props(styles.branchHandle).className}
          id={handleId}
          type="target"
          position={Position.Top}
          isConnectableEnd={isConnectable}
          isConnectableStart={false}
          style={{
            left: `${((index + 1) / (targetHandleIds.length + 1)) * 100}%`,
          }}
        />
      ))}
    </>
  );
};
