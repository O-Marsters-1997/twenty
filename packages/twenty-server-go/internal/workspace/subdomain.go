package workspace

import (
	_ "embed"
	"fmt"
	"math/rand/v2"
	"regexp"
	"slices"
	"strings"
)

const subdomainMaxLength = 30

var subdomainPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$`)

var nonSlugCharacters = regexp.MustCompile(`[^a-zA-Z0-9]+`)

var reservedSubdomains = []string{
	"about", "admin", "africa", "al", "america", "api", "app", "asia", "assets", "au", "audio", "auth", "az", "ba", "be", "bg",
	"billing", "blog", "ca", "careers", "cdn", "ch", "chat", "community", "companies", "config", "contact", "cy", "cz", "dash",
	"dashboard", "db", "de", "demo", "dev", "developer", "dk", "docs", "ee", "es", "eu", "europe", "events", "favicon", "feedback",
	"fi", "files", "forum", "fr", "gr", "help", "hr", "hu", "image", "images", "inbound", "is", "it", "jobs", "legal", "login",
	"logs", "london", "lt", "lv", "mail", "main", "me", "media", "merch", "metrics", "mk", "new-york", "news", "next", "nl", "no",
	"north-africa", "north-america", "nz", "oceania", "otel-collector", "paris", "partners", "partnership", "partnerships",
	"payment", "pl", "privacy", "production", "pt", "register", "ro", "rs", "ru", "san-francisco", "se", "settings", "shop", "si",
	"signin", "signup", "sk", "south-africa", "south-america", "staging", "storage", "store", "support", "t", "telemetry", "terms",
	"test", "testing", "tr", "trust", "ua", "uk", "us", "video", "www", "za",
}

//go:embed emailproviders.txt
var emailProvidersText string

var emailProviders = func() map[string]bool {
	providers := map[string]bool{}
	for domain := range strings.SplitSeq(emailProvidersText, "\n") {
		providers[domain] = true
	}
	return providers
}()

var (
	randomPrefixes = []string{
		"bold", "bouncy", "brave", "bright", "calm", "clever", "colorful", "cool", "eager", "fast", "fierce", "funny", "gentle",
		"glad", "graceful", "happy", "joyful", "kind", "lucky", "mighty", "noble", "quick", "sharp", "shiny", "silent", "smart",
		"swift", "wise", "witty", "zany", "agile", "amazing", "awesome", "brilliant", "cheerful", "dashing", "dynamic", "elegant",
		"energetic", "excellent", "fantastic", "friendly", "glorious", "grand", "helpful", "honest", "innovative", "inspiring",
		"jolly", "lively", "magical", "optimistic", "peaceful", "powerful", "radiant",
	}
	randomColors = []string{
		"almond", "amber", "azure", "beige", "black", "blue", "brown", "crimson", "cyan", "gold", "gray", "green", "indigo", "lime",
		"magenta", "maroon", "mint", "mustard", "orange", "peach", "pink", "purple", "red", "salmon", "silver", "teal", "turquoise",
		"violet", "white", "yellow", "aqua", "bronze", "burgundy", "cerulean", "charcoal", "coral", "emerald", "fuchsia", "garnet",
		"jade", "lavender", "navy", "platinum", "plum", "rose", "ruby", "sapphire", "scarlet",
	}
	randomAnimals = []string{
		"bear", "crocodile", "dolphin", "eagle", "elephant", "falcon", "fox", "giraffe", "hawk", "hedgehog", "horse", "kangaroo",
		"koala", "lion", "lynx", "monkey", "moose", "octopus", "owl", "panda", "panther", "penguin", "rabbit", "raccoon", "seal",
		"shark", "sparrow", "tiger", "whale", "wolf", "antelope", "badger", "buffalo", "camel", "cheetah", "deer", "dragon",
		"gazelle", "gorilla", "hippo", "jaguar", "lemur", "leopard", "llama", "meerkat", "otter", "peacock", "phoenix", "rhino",
		"zebra",
	}
)

func IsValidSubdomain(subdomain string) bool {
	return subdomainPattern.MatchString(subdomain) && !strings.HasPrefix(subdomain, "api-") &&
		!slices.Contains(reservedSubdomains, strings.ToLower(subdomain))
}

func SubdomainFromEmail(email string) (string, bool) {
	at := strings.LastIndex(email, "@")
	if at == -1 {
		return "", false
	}
	domain := email[at+1:]
	if domain == "" || emailProviders[domain] {
		return "", false
	}
	return strings.ToLower(strings.SplitN(domain, ".", 2)[0]), true
}

func RandomSubdomain() string {
	return fmt.Sprintf("%s-%s-%s",
		randomPrefixes[rand.IntN(len(randomPrefixes))], randomColors[rand.IntN(len(randomColors))], randomAnimals[rand.IntN(len(randomAnimals))])
}

func SubdomainSlug(displayName string) string {
	slug := strings.ToLower(strings.Trim(nonSlugCharacters.ReplaceAllString(displayName, "-"), "-"))
	if len(slug) > subdomainMaxLength {
		slug = slug[:subdomainMaxLength]
	}
	return strings.TrimRight(slug, "-")
}

func SubdomainCandidates(base string) []string {
	candidates := []string{base}
	for suffix := 2; suffix < 50; suffix++ {
		tail := fmt.Sprintf("-%d", suffix)
		trimmed := base
		if len(trimmed) > subdomainMaxLength-len(tail) {
			trimmed = strings.TrimRight(trimmed[:subdomainMaxLength-len(tail)], "-")
		}
		candidates = append(candidates, trimmed+tail)
	}
	for range 10 {
		candidates = append(candidates, RandomSubdomain())
	}
	seen := map[string]bool{}
	return slices.DeleteFunc(candidates, func(candidate string) bool {
		duplicate := seen[candidate]
		seen[candidate] = true
		return duplicate
	})
}
