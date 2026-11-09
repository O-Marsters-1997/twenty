package messaging

import (
	"errors"
	"time"
)

const (
	VisibilityMetadata        = "METADATA"
	VisibilitySubject         = "SUBJECT"
	VisibilityShareEverything = "SHARE_EVERYTHING"

	// TimelineThreadsMaxPageSize matches the Node resolver's @Max on pageSize.
	TimelineThreadsMaxPageSize = 50

	fieldRestricted = "FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED"
)

var ErrInvalidTimelinePage = errors.New("invalid timeline page")

type TimelineParticipant struct {
	PersonID, WorkspaceMemberID                         *string
	FirstName, LastName, DisplayName, AvatarURL, Handle string
}

type TimelineThread struct {
	ID                       string
	Read                     bool
	Visibility               string
	FirstParticipant         TimelineParticipant
	LastTwoParticipants      []TimelineParticipant
	LastMessageReceivedAt    time.Time
	LastMessageBody, Subject string
	NumberOfMessagesInThread int
	ParticipantCount         int
	LastMessageIsDraft       bool
}

type TimelineThreadsWithTotal struct {
	TotalNumberOfThreads int
	TimelineThreads      []TimelineThread
	RelatedPersonIDs     []string
}

// ThreadSummary is a thread's unredacted subject and last message, before visibility is applied.
type ThreadSummary struct {
	ID, Subject, LastMessageBody string
	LastMessageReceivedAt        time.Time
	MessageCount                 int
	LastMessageIsDraft           bool
}

// ThreadSender is one distinct FROM participant of a thread; name and avatar fields are empty when unset.
type ThreadSender struct {
	Handle                                           *string
	DisplayName                                      string
	PersonID, WorkspaceMemberID                      *string
	PersonFirstName, PersonLastName, PersonAvatarURL string
	MemberFirstName, MemberLastName, MemberAvatarURL string
}

// FormatThreads redacts each thread by its visibility and summarises its senders, dropping threads without any.
func FormatThreads(threads []ThreadSummary, sendersByThread map[string][]ThreadSender, visibilityByThread map[string]string) ([]TimelineThread, error) {
	formatted := make([]TimelineThread, 0, len(threads))
	for _, thread := range threads {
		senders, ok := sendersByThread[thread.ID]
		if !ok {
			continue
		}
		visibility, ok := visibilityByThread[thread.ID]
		if !ok {
			visibility = VisibilityMetadata
		}
		first, lastTwo, err := summariseSenders(senders)
		if err != nil {
			return nil, err
		}
		subject, body := fieldRestricted, fieldRestricted
		if visibility == VisibilityShareEverything || visibility == VisibilitySubject {
			subject = thread.Subject
		}
		if visibility == VisibilityShareEverything {
			body = thread.LastMessageBody
		}
		formatted = append(formatted, TimelineThread{
			ID: thread.ID, Read: true, Visibility: visibility,
			FirstParticipant: first, LastTwoParticipants: lastTwo,
			LastMessageReceivedAt: thread.LastMessageReceivedAt, LastMessageBody: body, Subject: subject,
			NumberOfMessagesInThread: thread.MessageCount, ParticipantCount: len(senders),
			LastMessageIsDraft: thread.LastMessageIsDraft,
		})
	}
	return formatted, nil
}

func summariseSenders(senders []ThreadSender) (TimelineParticipant, []TimelineParticipant, error) {
	first, err := participantOf(senders[0])
	if err != nil {
		return TimelineParticipant{}, nil, err
	}
	var others []ThreadSender
	for _, sender := range senders {
		if sender.Handle == nil || *sender.Handle != first.Handle {
			others = append(others, sender)
		}
	}
	lastTwo := []TimelineParticipant{}
	if len(others) == 0 {
		return first, lastTwo, nil
	}
	last := others[len(others)-1]
	lastParticipant, err := participantOf(last)
	if err != nil {
		return TimelineParticipant{}, nil, err
	}
	lastTwo = append(lastTwo, lastParticipant)
	var remaining []ThreadSender
	for _, sender := range others {
		if sender.Handle == nil || *sender.Handle != lastParticipant.Handle {
			remaining = append(remaining, sender)
		}
	}
	if len(remaining) > 0 {
		secondLast, err := participantOf(remaining[len(remaining)-1])
		if err != nil {
			return TimelineParticipant{}, nil, err
		}
		lastTwo = append(lastTwo, secondLast)
	}
	return first, lastTwo, nil
}

func participantOf(sender ThreadSender) (TimelineParticipant, error) {
	if sender.Handle == nil {
		return TimelineParticipant{}, errors.New("thread participant has an empty handle")
	}
	return TimelineParticipant{
		PersonID: sender.PersonID, WorkspaceMemberID: sender.WorkspaceMemberID,
		FirstName:   firstNonEmpty(sender.PersonFirstName, sender.MemberFirstName),
		LastName:    firstNonEmpty(sender.PersonLastName, sender.MemberLastName),
		DisplayName: firstNonEmpty(sender.PersonFirstName, sender.PersonLastName, sender.MemberFirstName, sender.MemberLastName, sender.DisplayName, *sender.Handle),
		AvatarURL:   firstNonEmpty(sender.PersonAvatarURL, sender.MemberAvatarURL),
		Handle:      *sender.Handle,
	}, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
