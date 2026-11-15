import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { useDebounce } from 'use-debounce';

import { useUnsubscribeTopics } from '@/activities/emails/hooks/useUnsubscribeTopics';
import { SettingsEmptyPlaceholder } from '@/settings/components/SettingsEmptyPlaceholder';
import { SettingsPaginationControls } from '@/settings/components/SettingsPaginationControls';
import { SettingsSectionSkeletonLoader } from '@/settings/components/SettingsSectionSkeletonLoader';
import { SettingsTableListSection } from '@/settings/components/SettingsTableListSection';
import { SettingsUnsubscribersFilterDropdown } from '@/settings/unsubscribers/components/filter-dropdown/SettingsUnsubscribersFilterDropdown';
import { MESSAGE_SUPPRESSIONS_PAGE_SIZE } from '@/settings/unsubscribers/constants/MessageSuppressionsPageSize';
import { SETTINGS_UNSUBSCRIBERS_ALL_FILTER } from '@/settings/unsubscribers/constants/SettingsUnsubscribersAllFilter';
import { useMessageSuppressions } from '@/settings/unsubscribers/hooks/useMessageSuppressions';
import { getMessageSuppressionReasonBadge } from '@/settings/unsubscribers/utils/getMessageSuppressionReasonBadge';
import { SearchInput } from 'twenty-ui/components/input';
import { Status } from 'twenty-ui/primitives/data-display';
import {
  MessageSuppressionReason,
  type MessageSuppressionsQuery,
} from '~/generated-metadata/graphql';
import { formatToHumanReadableDate } from '~/utils/date-utils';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  emailAddress: {
    color: fontColor['--t-font-color-primary'],
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
  },
  toolbar: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    width: '100%',
  },
  search: {
    flex: '1',
  },
});

type MessageSuppression =
  MessageSuppressionsQuery['messageSuppressions']['records'][number];

export const SettingsUnsubscribersList = () => {
  const { t } = useLingui();

  const [page, setPage] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText] = useDebounce(searchText, 300);
  const [reasonFilter, setReasonFilter] = useState(
    SETTINGS_UNSUBSCRIBERS_ALL_FILTER,
  );
  const [topicFilter, setTopicFilter] = useState(
    SETTINGS_UNSUBSCRIBERS_ALL_FILTER,
  );

  const { unsubscribeTopics } = useUnsubscribeTopics();

  const reason = Object.values(MessageSuppressionReason).find(
    (reasonValue) => reasonValue === reasonFilter,
  );
  const unsubscribeTopicId =
    topicFilter === SETTINGS_UNSUBSCRIBERS_ALL_FILTER ? undefined : topicFilter;

  const { messageSuppressions, totalCount, loading } = useMessageSuppressions({
    page,
    searchTerm: debouncedSearchText,
    reason,
    unsubscribeTopicId,
  });

  const goToFirstPage = () => setPage(0);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    goToFirstPage();
  };

  const handleReasonChange = (value: string) => {
    setReasonFilter(value);
    goToFirstPage();
  };

  const handleTopicChange = (value: string) => {
    setTopicFilter(value);
    goToFirstPage();
  };

  const handleClearFilters = () => {
    setReasonFilter(SETTINGS_UNSUBSCRIBERS_ALL_FILTER);
    setTopicFilter(SETTINGS_UNSUBSCRIBERS_ALL_FILTER);
    goToFirstPage();
  };

  const topicNameById = new Map(
    unsubscribeTopics.map((topic) => [
      topic.id,
      topic.name ?? t`Untitled topic`,
    ]),
  );

  const getScopeLabel = ({
    reason,
    unsubscribeTopicId,
  }: Pick<MessageSuppression, 'reason' | 'unsubscribeTopicId'>) => {
    if (reason === MessageSuppressionReason.TRACKING) {
      return t`Clicks only`;
    }

    if (!isDefined(unsubscribeTopicId)) {
      return t`All emails`;
    }

    return topicNameById.get(unsubscribeTopicId) ?? t`Unknown topic`;
  };

  const items = loading ? [] : messageSuppressions;
  const isEmpty = !loading && items.length === 0;
  const hasPagination = totalCount > MESSAGE_SUPPRESSIONS_PAGE_SIZE;
  const pageCount = Math.max(
    1,
    Math.ceil(totalCount / MESSAGE_SUPPRESSIONS_PAGE_SIZE),
  );

  return (
    <div {...stylex.props(styles.container)}>
      <SettingsTableListSection<MessageSuppression>
        title={t`Opt-outs`}
        description={t`Email addresses that opted out of campaign emails, a topic, or click tracking`}
        toolbar={
          <div {...stylex.props(styles.toolbar)}>
            <div {...stylex.props(styles.search)}>
              <SearchInput
                placeholder={t`Search by email address`}
                value={searchText}
                onValueChange={handleSearchChange}
              />
            </div>
            <SettingsUnsubscribersFilterDropdown
              topics={unsubscribeTopics}
              reasonValue={reasonFilter}
              topicValue={topicFilter}
              onChangeReason={handleReasonChange}
              onChangeTopic={handleTopicChange}
              onClear={handleClearFilters}
            />
          </div>
        }
        items={items}
        columns={[
          {
            label: t`Email address`,
            Cell: ({ item }) => (
              <span {...stylex.props(styles.emailAddress)}>
                {item.emailAddress}
              </span>
            ),
          },
          {
            label: t`Scope`,
            Cell: ({ item }) => <>{getScopeLabel(item)}</>,
          },
          {
            label: t`Reason`,
            Cell: ({ item }) => {
              const badge = getMessageSuppressionReasonBadge(item.reason);

              return (
                <Status color={badge.color} weight="medium">
                  {badge.label}
                </Status>
              );
            },
          },
          {
            label: t`Date`,
            align: 'right',
            Cell: ({ item }) => (
              <>{formatToHumanReadableDate(item.createdAt)}</>
            ),
          },
        ]}
        gridAutoColumns="1fr 160px 140px 160px"
      />
      {loading && <SettingsSectionSkeletonLoader />}
      {isEmpty && (
        <SettingsEmptyPlaceholder>
          {t`No unsubscribers found`}
        </SettingsEmptyPlaceholder>
      )}
      {hasPagination && (
        <SettingsPaginationControls
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          isLoading={loading}
        />
      )}
    </div>
  );
};
