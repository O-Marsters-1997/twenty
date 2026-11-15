import { isDefined } from '../../src/utilities/utils/isDefined';
import { type CollectedTokenLeaf } from '../types/CollectedTokenLeaf';

const capitalize = (segment: string) =>
  segment.charAt(0).toUpperCase() + segment.slice(1);

const GROUP_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;

const getGroupName = ([first, second, third]: string[]): string => {
  if (!isDefined(first) || !isDefined(second)) {
    return 'general';
  }
  return isDefined(third) ? `${first}${capitalize(second)}` : first;
};

export const groupLeavesForStylex = (
  leaves: CollectedTokenLeaf[],
): Map<string, CollectedTokenLeaf[]> => {
  const leavesByGroup = new Map<string, CollectedTokenLeaf[]>();
  for (const leaf of leaves) {
    const groupName = getGroupName(leaf.path);
    if (!GROUP_NAME_PATTERN.test(groupName)) {
      throw new Error(
        `Token "${leaf.path.join('.')}" maps to "${groupName}", which is not a valid export name.`,
      );
    }
    leavesByGroup.set(groupName, [
      ...(leavesByGroup.get(groupName) ?? []),
      leaf,
    ]);
  }
  return leavesByGroup;
};
