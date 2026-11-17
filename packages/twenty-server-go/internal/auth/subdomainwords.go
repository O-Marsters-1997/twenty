package auth

var reservedSubdomains = []string{
	"about", "admin", "africa", "al", "america", "api", "app", "asia", "assets", "au", "audio", "auth", "az",
	"ba", "be", "bg", "billing", "blog", "ca", "careers", "cdn", "ch", "chat", "community", "companies",
	"config", "contact", "cy", "cz", "dash", "dashboard", "db", "de", "demo", "dev", "developer", "dk", "docs",
	"ee", "es", "eu", "europe", "events", "favicon", "feedback", "fi", "files", "forum", "fr", "gr", "help",
	"hr", "hu", "image", "images", "inbound", "is", "it", "jobs", "legal", "login", "logs", "london", "lt", "lv",
	"mail", "main", "me", "media", "merch", "metrics", "mk", "new-york", "news", "next", "nl", "no",
	"north-africa", "north-america", "nz", "oceania", "otel-collector", "paris", "partners", "partnership",
	"partnerships", "payment", "pl", "privacy", "production", "pt", "register", "ro", "rs", "ru",
	"san-francisco", "se", "settings", "shop", "si", "signin", "signup", "sk", "south-africa", "south-america",
	"staging", "storage", "store", "support", "t", "telemetry", "terms", "test", "testing", "tr", "trust", "ua",
	"uk", "us", "video", "www", "za",
}

var randomPrefixes = []string{
	"bold", "bouncy", "brave", "bright", "calm", "clever", "colorful", "cool", "eager", "fast", "fierce",
	"funny", "gentle", "glad", "graceful", "happy", "joyful", "kind", "lucky", "mighty", "noble", "quick",
	"sharp", "shiny", "silent", "smart", "swift", "wise", "witty", "zany", "agile", "amazing", "awesome",
	"brilliant", "cheerful", "dashing", "dynamic", "elegant", "energetic", "excellent", "fantastic", "friendly",
	"glorious", "grand", "helpful", "honest", "innovative", "inspiring", "jolly", "lively", "magical",
	"optimistic", "peaceful", "powerful", "radiant",
}
var randomSuffixes = []string{
	"bear", "crocodile", "dolphin", "eagle", "elephant", "falcon", "fox", "giraffe", "hawk", "hedgehog", "horse",
	"kangaroo", "koala", "lion", "lynx", "monkey", "moose", "octopus", "owl", "panda", "panther", "penguin",
	"rabbit", "raccoon", "seal", "shark", "sparrow", "tiger", "whale", "wolf", "antelope", "badger", "buffalo",
	"camel", "cheetah", "deer", "dragon", "gazelle", "gorilla", "hippo", "jaguar", "lemur", "leopard", "llama",
	"meerkat", "otter", "peacock", "phoenix", "rhino", "zebra",
}
var randomColors = []string{
	"almond", "amber", "azure", "beige", "black", "blue", "brown", "crimson", "cyan", "gold", "gray", "green",
	"indigo", "lime", "magenta", "maroon", "mint", "mustard", "orange", "peach", "pink", "purple", "red",
	"salmon", "silver", "teal", "turquoise", "violet", "white", "yellow", "aqua", "bronze", "burgundy",
	"cerulean", "charcoal", "coral", "emerald", "fuchsia", "garnet", "jade", "lavender", "navy", "platinum",
	"plum", "rose", "ruby", "sapphire", "scarlet",
}
