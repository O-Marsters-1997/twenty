package messaging

import "strings"

type Audience struct {
	TotalMembers, WithoutEmail, DuplicateEmails, HardSuppressed int
	GloballyUnsubscribed, TopicUnsubscribed, TrackingRefused    int
	Sendable                                                    int
}

type ListMember struct {
	PersonID, Email, FirstName, LastName string
}

type Suppression struct {
	Email, Reason, TopicID string
}

func ResolveAudience(members []ListMember, suppressions []Suppression) ([]Recipient, Audience) {
	hard, global, topic, tracking := map[string]bool{}, map[string]bool{}, map[string]bool{}, map[string]bool{}
	for _, suppression := range suppressions {
		email := strings.ToLower(strings.TrimSpace(suppression.Email))
		switch {
		case suppression.Reason == "TRACKING":
			tracking[email] = true
		case suppression.TopicID != "":
			topic[email] = true
		case suppression.Reason == "BOUNCE" || suppression.Reason == "COMPLAINT":
			hard[email] = true
		default:
			global[email] = true
		}
	}

	audience := Audience{TotalMembers: len(members)}
	seen := map[string]bool{}
	var sendable []Recipient
	for _, member := range members {
		email := strings.ToLower(strings.TrimSpace(member.Email))
		switch {
		case email == "":
			audience.WithoutEmail++
		case seen[email]:
			audience.DuplicateEmails++
		default:
			seen[email] = true
			switch {
			case hard[email]:
				audience.HardSuppressed++
			case global[email]:
				audience.GloballyUnsubscribed++
			case topic[email]:
				audience.TopicUnsubscribed++
			default:
				if tracking[email] {
					audience.TrackingRefused++
				}
				sendable = append(sendable, Recipient{
					PersonID: member.PersonID, Email: email,
					Variables: map[string]any{"name.firstName": member.FirstName, "name.lastName": member.LastName},
				})
			}
		}
	}
	audience.Sendable = len(sendable)
	return sendable, audience
}
