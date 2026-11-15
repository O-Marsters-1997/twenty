import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DROPDOWN_OFFSET_Y } from '@/ui/layout/dropdown/constants/DropdownOffsetY';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type WorkspaceMember } from '@/workspace-member/types/WorkspaceMember';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  AppPath,
  CoreObjectNameSingular,
  SettingsPath,
} from 'twenty-shared/types';
import { generateILikeFiltersForCompositeFields } from 'twenty-shared/utils';
import { SearchInput } from 'twenty-ui/components/input';
import { Section } from 'twenty-ui/components/layout';
import { Dropdown } from 'twenty-ui/components/navigation';
import {
  IconArrowUpRight,
  IconChevronRight,
  IconHierarchy,
  IconListDetails,
} from 'twenty-ui/icon';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { Button } from 'twenty-ui/primitives/input';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import { useDebounce } from 'use-debounce';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import { normalizeSearchText } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { borderColor, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  tableWithBottomBorder: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  fetchMoreSentinel: {
    height: '1px',
  },
  iconWrapper: {
    alignItems: 'center',
    display: 'flex',
    marginRight: spacing['--t-spacing-2'],
  },
  textContainerWithEllipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  searchContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
  },
  tableRows: {
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  chevronWrapper: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
  },
});

export const SettingsWorkspaceMembersTeamTab = () => {
  const theme = useTheme();
  const { t } = useLingui();
  const navigateApp = useNavigateApp();
  const navigateSettings = useNavigateSettings();
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const [debouncedSearchFilter] = useDebounce(searchFilter, 300);

  const searchServerFilter = useMemo(() => {
    if (!debouncedSearchFilter?.trim()) return undefined;

    const normalizedSearchTerm = normalizeSearchText(debouncedSearchFilter);
    const nameFilters = generateILikeFiltersForCompositeFields(
      normalizedSearchTerm,
      'name',
      ['firstName', 'lastName'],
    );

    return {
      or: [
        ...nameFilters,
        { userEmail: { ilike: `%${normalizedSearchTerm}%` } },
      ],
    };
  }, [debouncedSearchFilter]);

  const {
    records: workspaceMembers,
    fetchMoreRecords,
    hasNextPage,
    loading,
  } = useFindManyRecords<WorkspaceMember>({
    objectNameSingular: CoreObjectNameSingular.WorkspaceMember,
    filter: searchServerFilter,
  });

  const handleSearchChange = (text: string) => {
    setSearchFilter(text);
  };

  const { ref: fetchMoreRef } = useInView({
    onChange: async (inView) => {
      if (inView && hasNextPage && !loading && !isFetchingMore) {
        setIsFetchingMore(true);
        await fetchMoreRecords();
        setIsFetchingMore(false);
      }
    },
    delay: 100,
    rootMargin: '1000px',
    threshold: 0,
  });

  const optimizedWorkspaceMembers = useMemo(() => {
    if (!searchFilter.trim()) {
      return workspaceMembers;
    }

    const normalizedSearchTerm = normalizeSearchText(searchFilter);
    const searchTerms = normalizedSearchTerm.split(/\s+/);

    return workspaceMembers.filter((member) => {
      const firstName = normalizeSearchText(member.name.firstName);
      const lastName = normalizeSearchText(member.name.lastName);
      const email = normalizeSearchText(member.userEmail);
      const fullName = `${firstName} ${lastName}`.trim();

      return searchTerms.every(
        (term) =>
          firstName.includes(term) ||
          lastName.includes(term) ||
          fullName.includes(term) ||
          email.includes(term),
      );
    });
  }, [workspaceMembers, searchFilter]);

  return (
    <Section.Root>
      <Section.Header
        title={t`Manage Members`}
        description={t`Manage the members of your workspace here`}
      />
      <div {...stylex.props(styles.searchContainer)}>
        <SearchInput
          value={searchFilter}
          onValueChange={handleSearchChange}
          placeholder={t`Search a team member...`}
        />
        <DropdownRoot type="menu" dropdownId="workspace-members-open-dropdown">
          <Dropdown.Trigger
            render={
              <Button
                startIcon={<IconArrowUpRight />}
                size="md"
                variant="outline"
              >{t`Open`}</Button>
            }
          />
          <DropdownContent align="end" sideOffset={DROPDOWN_OFFSET_Y}>
            <Dropdown.Section>
              <Dropdown.ActionItem
                startIcon={<IconListDetails />}
                onClick={() => {
                  navigateApp(AppPath.RecordIndexPage, {
                    objectNamePlural: 'workspaceMembers',
                  });
                }}
              >{t`See records`}</Dropdown.ActionItem>
              <Dropdown.ActionItem
                startIcon={<IconHierarchy />}
                onClick={() => {
                  navigateSettings(SettingsPath.ObjectDetail, {
                    objectNamePlural: 'workspaceMembers',
                  });
                }}
              >{t`See data model settings`}</Dropdown.ActionItem>
            </Dropdown.Section>
          </DropdownContent>
        </DropdownRoot>
      </div>
      <Table {...stylex.props(!hasNextPage && styles.tableWithBottomBorder)}>
        <TableRow
          gridAutoColumns="150px 1fr 40px"
          mobileGridAutoColumns="100px 1fr 32px"
        >
          <TableHeader>
            <Trans>Name</Trans>
          </TableHeader>
          <TableHeader>
            <Trans>Email</Trans>
          </TableHeader>
          <TableHeader align="right"></TableHeader>
        </TableRow>
        <div {...stylex.props(styles.tableRows)}>
          {optimizedWorkspaceMembers.length > 0 ? (
            optimizedWorkspaceMembers.map((workspaceMember) => (
              <TableRow
                gridAutoColumns="150px 1fr 40px"
                mobileGridAutoColumns="100px 1fr 32px"
                key={workspaceMember.id}
                cursor="pointer"
                onClick={() => {
                  if (currentWorkspaceMember?.id === workspaceMember.id) {
                    return;
                  }
                  navigateSettings(SettingsPath.WorkspaceMemberPage, {
                    workspaceMemberId: workspaceMember.id,
                  });
                }}
              >
                <TableCell color={themeCssVariables.font.color.primary}>
                  <div {...stylex.props(styles.iconWrapper)}>
                    <Avatar
                      src={getAbsoluteImageUrl(workspaceMember.avatarUrl)}
                      colorSeed={workspaceMember.id}
                      name={workspaceMember.name.firstName ?? ''}
                      shape="circle"
                      size="sm"
                    />
                  </div>
                  <Tooltip
                    content={`${workspaceMember.name.firstName} ${workspaceMember.name.lastName}`}
                    side="top"
                    positionMethod="fixed"
                    delay={TooltipDelay.shortDelay}
                  >
                    <div
                      id={`hover-text-${workspaceMember.id}`}
                      {...stylex.props(styles.textContainerWithEllipsis)}
                    >
                      {workspaceMember.name.firstName +
                        ' ' +
                        workspaceMember.name.lastName}
                    </div>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div {...stylex.props(styles.textContainerWithEllipsis)}>
                    {workspaceMember.userEmail}
                  </div>
                </TableCell>
                <TableCell align="right">
                  <div {...stylex.props(styles.chevronWrapper)}>
                    {currentWorkspaceMember?.id !== workspaceMember.id && (
                      <IconChevronRight size={theme.icon.size.sm} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableCell color={themeCssVariables.font.color.tertiary}>
              {!searchFilter ? t`No members` : t`No members match your search`}
            </TableCell>
          )}
        </div>
        {hasNextPage && (
          <TableRow
            gridAutoColumns="250px 1fr 1fr"
            mobileGridAutoColumns="100px 1fr 1fr"
          >
            <TableCell>
              <div
                ref={fetchMoreRef}
                {...stylex.props(styles.fetchMoreSentinel)}
              />
            </TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
          </TableRow>
        )}
      </Table>
    </Section.Root>
  );
};
