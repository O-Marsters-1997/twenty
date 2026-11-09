package messaging_test

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

type fakeCampaignStore struct {
	recipients []messaging.Recipient
	suppressed []string
	deliveries map[string]*messaging.Delivery
	settled    map[string]messaging.DeliverySettlement
	finished   messaging.CampaignStatus
}

func newFakeCampaignStore(recipients []messaging.Recipient, suppressed ...string) *fakeCampaignStore {
	return &fakeCampaignStore{
		recipients: recipients, suppressed: suppressed,
		deliveries: map[string]*messaging.Delivery{}, settled: map[string]messaging.DeliverySettlement{},
	}
}

func (s *fakeCampaignStore) Campaign(context.Context, string) (messaging.Campaign, error) {
	return messaging.Campaign{ID: "c1", Subject: "Hi", Template: `{"type":"doc","content":[]}`, ConnectedAccountID: "a1"}, nil
}

func (s *fakeCampaignStore) Recipients(context.Context, string) ([]messaging.Recipient, error) {
	return s.recipients, nil
}

func (s *fakeCampaignStore) SuppressedAddresses(context.Context) ([]string, error) {
	return s.suppressed, nil
}

func (s *fakeCampaignStore) CreateDeliveries(_ context.Context, campaignID string, recipients []messaging.Recipient) ([]string, error) {
	var ids []string
	for _, recipient := range recipients {
		id := "d-" + recipient.Email
		s.deliveries[id] = &messaging.Delivery{ID: id, CampaignID: campaignID, Email: recipient.Email, Status: messaging.DeliveryQueued}
		ids = append(ids, id)
	}
	return ids, nil
}

func (s *fakeCampaignStore) Delivery(_ context.Context, id string) (messaging.Delivery, error) {
	delivery, ok := s.deliveries[id]
	if !ok {
		return messaging.Delivery{}, messaging.ErrDeliveryNotFound
	}
	return *delivery, nil
}

func (s *fakeCampaignStore) Settle(_ context.Context, id string, settlement messaging.DeliverySettlement) error {
	s.settled[id] = settlement
	s.deliveries[id].Status = settlement.Status
	return nil
}

func (s *fakeCampaignStore) RecordOutcome(_ context.Context, providerMessageID string, _ messaging.ProviderOutcome) (string, error) {
	for id, settlement := range s.settled {
		if settlement.ProviderMsgID == providerMessageID {
			return s.deliveries[id].CampaignID, nil
		}
	}
	return "", nil
}

func (s *fakeCampaignStore) Counts(context.Context, string) (messaging.CampaignCounts, error) {
	var counts messaging.CampaignCounts
	for _, delivery := range s.deliveries {
		counts.Total++
		switch delivery.Status {
		case messaging.DeliveryQueued, messaging.DeliverySending:
			counts.InProgress++
		case messaging.DeliveryFailed:
			counts.Failed++
		case messaging.DeliverySkipped:
			counts.Skipped++
		}
	}
	return counts, nil
}

func (s *fakeCampaignStore) Finish(_ context.Context, _ string, status messaging.CampaignStatus) error {
	s.finished = status
	return nil
}

type fakeMailer struct {
	sentTo []string
	err    error
}

func (m *fakeMailer) Send(_ context.Context, _ string, email messaging.OutboundEmail) (string, error) {
	if m.err != nil {
		return "", m.err
	}
	m.sentTo = append(m.sentTo, email.To...)
	return "msg-1", nil
}

func (m *fakeMailer) Draft(context.Context, string, messaging.OutboundEmail) (string, error) {
	return "", nil
}

func newCampaigns(store *fakeCampaignStore, mailer *fakeMailer, queued *[]string) *messaging.Campaigns {
	return &messaging.Campaigns{
		Store: store, Renderer: messaging.GoRenderer{}, Mailer: mailer,
		Queue: func(_ context.Context, args river.JobArgs) error {
			*queued = append(*queued, args.(messaging.DeliverCampaignMessageArgs).DeliveryID)
			return nil
		},
	}
}

func TestCampaigns_Send(t *testing.T) {
	t.Parallel()

	store := newFakeCampaignStore([]messaging.Recipient{{Email: "a@x.com"}, {Email: "Blocked@x.com"}, {Email: "b@x.com"}}, "blocked@x.com")
	var queued []string

	if err := newCampaigns(store, &fakeMailer{}, &queued).Send(context.Background(), "c1"); err != nil {
		t.Fatal(err)
	}

	if want := []string{"d-a@x.com", "d-b@x.com"}; !slices.Equal(queued, want) {
		t.Errorf("queued = %v, want %v", queued, want)
	}
}

func TestCampaigns_Deliver(t *testing.T) {
	t.Parallel()

	deliver := func(mailer *fakeMailer, lastAttempt bool, suppressed ...string) (*fakeCampaignStore, error) {
		store := newFakeCampaignStore(nil, suppressed...)
		store.deliveries["d1"] = &messaging.Delivery{ID: "d1", CampaignID: "c1", Email: "a@x.com", Status: messaging.DeliveryQueued}
		var queued []string
		return store, newCampaigns(store, mailer, &queued).Deliver(context.Background(), "d1", lastAttempt)
	}

	t.Run("sends and settles the campaign", func(t *testing.T) {
		t.Parallel()
		store, err := deliver(&fakeMailer{}, false)
		if err != nil {
			t.Fatal(err)
		}
		if got := store.settled["d1"]; got.Status != messaging.DeliverySent || got.ProviderMsgID != "msg-1" {
			t.Errorf("settlement = %+v, want SENT msg-1", got)
		}
		if store.finished != messaging.CampaignSent {
			t.Errorf("campaign status = %q, want SENT", store.finished)
		}
	})

	t.Run("never mails an address suppressed after fan-out", func(t *testing.T) {
		t.Parallel()
		mailer := &fakeMailer{}
		store, err := deliver(mailer, false, "a@x.com")
		if err != nil {
			t.Fatal(err)
		}
		if len(mailer.sentTo) != 0 || store.settled["d1"].Status != messaging.DeliverySkipped {
			t.Errorf("sentTo = %v, settlement = %+v, want nothing sent and SKIPPED", mailer.sentTo, store.settled["d1"])
		}
		if store.finished != messaging.CampaignSentWithErrors {
			t.Errorf("campaign status = %q, want SENT_WITH_ERRORS", store.finished)
		}
	})

	t.Run("retries a transient failure", func(t *testing.T) {
		t.Parallel()
		store, err := deliver(&fakeMailer{err: errors.New("gmail 503")}, false)
		if err == nil || len(store.settled) != 0 {
			t.Errorf("err = %v, settled = %v, want error and nothing settled", err, store.settled)
		}
	})

	t.Run("settles a transient failure FAILED on the last attempt", func(t *testing.T) {
		t.Parallel()
		store, err := deliver(&fakeMailer{err: errors.New("gmail 503")}, true)
		if err == nil || store.settled["d1"].Status != messaging.DeliveryFailed {
			t.Errorf("err = %v, settlement = %+v, want error and FAILED", err, store.settled["d1"])
		}
		if store.finished != messaging.CampaignSentWithErrors {
			t.Errorf("campaign status = %q, want SENT_WITH_ERRORS", store.finished)
		}
	})

	t.Run("settles FAILED without retry when the account needs reconnecting", func(t *testing.T) {
		t.Parallel()
		store, err := deliver(&fakeMailer{err: messaging.ErrAccountAuthFailed}, false)
		if !errors.Is(err, messaging.ErrDeliveryFailed) || store.settled["d1"].Status != messaging.DeliveryFailed {
			t.Errorf("err = %v, settlement = %+v, want ErrDeliveryFailed and FAILED", err, store.settled["d1"])
		}
	})

	t.Run("ignores a delivery that is already settled", func(t *testing.T) {
		t.Parallel()
		store := newFakeCampaignStore(nil)
		store.deliveries["d1"] = &messaging.Delivery{ID: "d1", CampaignID: "c1", Email: "a@x.com", Status: messaging.DeliverySent}
		mailer := &fakeMailer{}
		var queued []string

		if err := newCampaigns(store, mailer, &queued).Deliver(context.Background(), "d1", false); err != nil {
			t.Fatal(err)
		}
		if len(mailer.sentTo) != 0 {
			t.Errorf("sentTo = %v, want none", mailer.sentTo)
		}
	})
}

func TestCampaigns_RecordOutcome(t *testing.T) {
	t.Parallel()

	store := newFakeCampaignStore(nil)
	store.deliveries["d1"] = &messaging.Delivery{ID: "d1", CampaignID: "c1", Status: messaging.DeliverySent}
	store.settled["d1"] = messaging.DeliverySettlement{Status: messaging.DeliverySent, ProviderMsgID: "msg-1"}
	var queued []string
	campaigns := newCampaigns(store, &fakeMailer{}, &queued)

	if err := campaigns.RecordOutcome(context.Background(), "unknown", "BOUNCED"); err != nil {
		t.Fatal(err)
	}
	if store.finished != "" {
		t.Errorf("campaign status = %q for an unknown message, want unchanged", store.finished)
	}
	if err := campaigns.RecordOutcome(context.Background(), "msg-1", "BOUNCED"); err != nil {
		t.Fatal(err)
	}
	if store.finished != messaging.CampaignSent {
		t.Errorf("campaign status = %q, want SENT once no delivery is in progress", store.finished)
	}
}
