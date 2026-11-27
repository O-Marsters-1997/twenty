package chart

import (
	"fmt"
	"time"
)

var shortMonths = [...]string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}

func parseDate(value string) (time.Time, error) {
	if instant, err := time.Parse(time.RFC3339, value); err == nil {
		year, month, day := instant.UTC().Date()
		return time.Date(year, month, day, 0, 0, 0, 0, time.UTC), nil
	}
	if len(value) >= len(time.DateOnly) {
		if date, err := time.Parse(time.DateOnly, value[:len(time.DateOnly)]); err == nil {
			return date, nil
		}
	}
	return time.Time{}, fmt.Errorf("parse date %q: unsupported format", value)
}

func addMonths(date time.Time, months int) time.Time {
	firstOfTarget := time.Date(date.Year(), date.Month()+time.Month(months), 1, 0, 0, 0, 0, time.UTC)
	lastDay := firstOfTarget.AddDate(0, 1, -1).Day()
	return firstOfTarget.AddDate(0, 0, min(date.Day(), lastDay)-1)
}

func (first FirstDayOfTheWeek) isoWeekday() int {
	switch first {
	case Sunday:
		return 7
	case Saturday:
		return 6
	}
	return 1
}

func isoWeekday(date time.Time) int {
	if date.Weekday() == time.Sunday {
		return 7
	}
	return int(date.Weekday())
}

func formatDateByGranularity(date time.Time, granularity Granularity, firstDay FirstDayOfTheWeek) string {
	switch granularity {
	case GranularityDay:
		return fmt.Sprintf("%s %d, %d", shortMonths[date.Month()-1], date.Day(), date.Year())
	case GranularityWeek:
		start := date.AddDate(0, 0, -((isoWeekday(date) - firstDay.isoWeekday() + 7) % 7))
		end := start.AddDate(0, 0, 6)
		startMonth, endMonth := shortMonths[start.Month()-1], shortMonths[end.Month()-1]
		switch {
		case start.Year() != end.Year():
			return fmt.Sprintf("%s %d, %d - %s %d, %d", startMonth, start.Day(), start.Year(), endMonth, end.Day(), end.Year())
		case startMonth != endMonth:
			return fmt.Sprintf("%s %d - %s %d, %d", startMonth, start.Day(), endMonth, end.Day(), end.Year())
		}
		return fmt.Sprintf("%s %d - %d, %d", startMonth, start.Day(), end.Day(), end.Year())
	case GranularityMonth:
		return fmt.Sprintf("%s %d", date.Month(), date.Year())
	case GranularityQuarter:
		return fmt.Sprintf("Q%d %d", (int(date.Month())+2)/3, date.Year())
	case GranularityYear:
		return fmt.Sprint(date.Year())
	}
	return fmt.Sprintf("%d/%d/%d", int(date.Month()), date.Day(), date.Year())
}
