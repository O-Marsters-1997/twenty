import * as stylex from '@stylexjs/stylex';
import { Position } from '@xyflow/react';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';

const styles = stylex.create({
  root: {
    position: 'absolute',
    width: 'fit-content',
  },
  transform: (transform: string) => ({ transform }),
});

type WorkflowDiagramEdgeLabelContainerProps = {
  sourceX: number;
  sourceY: number;
  position: Position;
  centerX?: number;
  centerY?: number;
  children?: ReactNode;
};

const getTransform = ({
  position,
  sourceX,
  sourceY,
  centerX,
  centerY,
}: Omit<WorkflowDiagramEdgeLabelContainerProps, 'children'>) => {
  if (isDefined(centerX) && isDefined(centerY)) {
    return `translate(-50%, -50%) translate(${centerX}px, ${centerY}px)`;
  }
  switch (position) {
    case Position.Right:
      return `translate(0%, -50%) translate(${Math.floor(sourceX)}px, ${sourceY}px) translateX(10px)`;
    case Position.Bottom:
      return `translate(-50%, 0%) translate(${sourceX}px, ${Math.floor(sourceY)}px) translateY(10px)`;
    default:
      return 'none';
  }
};

export const WorkflowDiagramEdgeLabelContainer = ({
  children,
  ...transformArguments
}: WorkflowDiagramEdgeLabelContainerProps) => (
  <div
    {...stylex.props(
      styles.root,
      styles.transform(getTransform(transformArguments)),
    )}
  >
    {children}
  </div>
);
