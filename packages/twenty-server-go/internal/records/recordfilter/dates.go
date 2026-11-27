package recordfilter

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	plainDateLayout = "2006-01-02"
	instantLayout   = "2006-01-02T15:04:05.999999999Z07:00"
)

var relativeDatePattern = regexp.MustCompile(`(THIS|PAST|NEXT)_(\d*)_(DAY|MONTH|YEAR|WEEK|QUARTER|HOUR|MINUTE|SECOND)(?:(?:;;([^;]*);;)?(?:(MONDAY|SUNDAY|SATURDAY);;)?)?`)

type relativeDate struct {
	direction string
	amount    int
	unit      string
	timeZone  string
	firstDay  string
}

func parseRelativeDate(value string) (relativeDate, bool) {
	match := relativeDatePattern.FindStringSubmatch(value)
	if match == nil {
		return relativeDate{}, false
	}
	amount, err := strconv.Atoi(match[2])
	if err != nil || amount <= 0 {
		return relativeDate{}, false
	}
	return relativeDate{direction: match[1], amount: amount, unit: match[3], timeZone: match[4], firstDay: match[5]}, true
}

func loadLocation(name string) (*time.Location, error) {
	if name == "" {
		return time.UTC, nil
	}
	location, err := time.LoadLocation(name)
	if err != nil {
		return nil, fmt.Errorf("%w: unknown time zone %q", ErrInvalidFilter, name)
	}
	return location, nil
}

func (r relativeDate) bounds(reference time.Time) (time.Time, time.Time) {
	switch r.direction {
	case "NEXT":
		start := nextPeriodStart(reference, r.unit, r.firstDay)
		return start, shift(start, r.unit, r.amount)
	case "PAST":
		current := periodStart(reference, r.unit, r.firstDay)
		return shift(current, r.unit, -r.amount), current
	}
	return periodStart(reference, r.unit, r.firstDay), nextPeriodStart(reference, r.unit, r.firstDay)
}

func periodStart(t time.Time, unit, firstDay string) time.Time {
	location := t.Location()
	year, month, day := t.Date()
	switch unit {
	case "DAY":
		return time.Date(year, month, day, 0, 0, 0, 0, location)
	case "WEEK":
		firstISO := map[string]int{"SATURDAY": 6, "SUNDAY": 7}[firstDay]
		if firstISO == 0 {
			firstISO = 1
		}
		weekday := int(t.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		return time.Date(year, month, day-(weekday-firstISO+7)%7, 0, 0, 0, 0, location)
	case "MONTH":
		return time.Date(year, month, 1, 0, 0, 0, 0, location)
	case "QUARTER":
		return time.Date(year, time.Month((int(month)-1)/3*3+1), 1, 0, 0, 0, 0, location)
	case "YEAR":
		return time.Date(year, time.January, 1, 0, 0, 0, 0, location)
	case "HOUR":
		return time.Date(year, month, day, t.Hour(), 0, 0, 0, location)
	case "MINUTE":
		return time.Date(year, month, day, t.Hour(), t.Minute(), 0, 0, location)
	}
	return time.Date(year, month, day, t.Hour(), t.Minute(), t.Second(), 0, location)
}

func nextPeriodStart(t time.Time, unit, firstDay string) time.Time {
	return shift(periodStart(t, unit, firstDay), unit, 1)
}

func shift(t time.Time, unit string, amount int) time.Time {
	switch unit {
	case "DAY":
		return t.AddDate(0, 0, amount)
	case "WEEK":
		return t.AddDate(0, 0, 7*amount)
	case "MONTH":
		return t.AddDate(0, amount, 0)
	case "QUARTER":
		return t.AddDate(0, 3*amount, 0)
	case "YEAR":
		return t.AddDate(amount, 0, 0)
	case "HOUR":
		return t.Add(time.Duration(amount) * time.Hour)
	case "MINUTE":
		return t.Add(time.Duration(amount) * time.Minute)
	}
	return t.Add(time.Duration(amount) * time.Second)
}

func formatInstant(t time.Time) string {
	return t.UTC().Format(instantLayout)
}

func parseInstant(value string) (time.Time, error) {
	instant, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}, fmt.Errorf("%w: cannot parse %q as a date time", ErrInvalidFilter, value)
	}
	return instant, nil
}

func (b builder) timeZone() (*time.Location, error) {
	return loadLocation(b.deps.TimeZone)
}

func (b builder) relativePlainDates(value string) (string, string, error) {
	relative, ok := parseRelativeDate(value)
	if !ok {
		relative = relativeDate{direction: "PAST", amount: 1, unit: "DAY"}
	}
	location, err := loadLocation(relative.timeZone)
	if err != nil {
		return "", "", err
	}
	start, end := relative.bounds(b.now.In(location))
	return start.Format(plainDateLayout), end.Format(plainDateLayout), nil
}

func (b builder) relativeInstants(value string) (string, string, error) {
	relative, ok := parseRelativeDate(value)
	if !ok {
		return "", "", fmt.Errorf("%w: cannot parse relative date filter %q", ErrInvalidFilter, value)
	}
	location, err := loadLocation(relative.timeZone)
	if err != nil {
		return "", "", err
	}
	start, end := relative.bounds(b.now.In(location).Round(time.Second))
	return formatInstant(start), formatInstant(end), nil
}

func (b builder) dayRangeOf(value string) (string, string, error) {
	location, err := b.timeZone()
	if err != nil {
		return "", "", err
	}

	var day time.Time
	if strings.Contains(value, "T") {
		instant, err := parseInstant(value)
		if err != nil {
			return "", "", err
		}
		day = instant.In(location)
	} else {
		plain, err := time.Parse(plainDateLayout, value)
		if err != nil {
			return "", "", fmt.Errorf("%w: cannot parse %q as a date", ErrInvalidFilter, value)
		}
		day = plain
	}

	year, month, date := day.Date()
	start := time.Date(year, month, date, 0, 0, 0, 0, location)
	return formatInstant(start), formatInstant(start.AddDate(0, 0, 1)), nil
}
