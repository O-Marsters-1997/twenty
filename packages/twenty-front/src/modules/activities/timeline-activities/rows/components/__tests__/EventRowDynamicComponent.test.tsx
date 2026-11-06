import { EventRowDynamicComponent } from '@/activities/timeline-activities/rows/components/EventRowDynamicComponent';
import { type TimelineActivity } from '@/activities/timeline-activities/types/TimelineActivity';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock(
  '@/activities/timeline-activities/rows/main-object/components/EventRowMainObject',
  () => ({ EventRowMainObject: () => <div>Native timeline row</div> }),
);

const mainObjectMetadataItem = {
  nameSingular: 'company',
} as EnrichedObjectMetadataItem;

describe('EventRowDynamicComponent', () => {
  it('mounts a standard renderer only after the row is expanded', async () => {
    const user = userEvent.setup();
    const StandardRenderer = () => <div>Standard timeline component</div>;

    render(
      <I18nProvider i18n={i18n}>
        <EventRowDynamicComponent
          labelIdentifierValue="Acme"
          event={{ id: 'activity-id', properties: {} } as TimelineActivity}
          eventAction="created"
          eventTypeLabel="was created"
          renderer={StandardRenderer}
          mainObjectMetadataItem={mainObjectMetadataItem}
          linkedObjectMetadataItem={null}
          authorFullName="Ada Lovelace"
        />
      </I18nProvider>,
    );

    expect(
      screen.queryByText('Standard timeline component'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand details' }));

    expect(screen.getByText('Standard timeline component')).toBeInTheDocument();
  });
});
