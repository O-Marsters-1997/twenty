# Plan: Move the backend to Go

> Source: docs/prds/go-backend-migration.md
> Label: project:go-backend-migration
> Feature branch: feature/go-backend-migration

A Go modular monolith in `packages/twenty-server-go` (`cmd/api`, `cmd/worker`, `cmd/migrate`, modules under `internal/<module>/`) takes over the backend from `packages/twenty-server` one GraphQL operation at a time, behind a front door that proxies the rest to Node. Each module's `store` package alone imports pgx and its sqlc output.

Definitions are frozen once tickets are cut: changing one is a `contract-change` issue that blocks dependent work, never a quiet edit.

## Phases

1. [Go front door with people](#phase-1-go-front-door-with-people)
2. [All records on Go](#phase-2-all-records-on-go)
3. [AI on Go](#phase-3-ai-on-go)
4. [Workflows on Go](#phase-4-workflows-on-go)
5. [Messaging on Go](#phase-5-messaging-on-go)
6. [Auth on Go](#phase-6-auth-on-go)
7. [Node removed](#phase-7-node-removed)

## Phase 1: Go front door with people

Journeys: J1, J2, J3, J4

**Glossary**

- **Front door**: `cmd/api`'s HTTP entry on :3000; serves owned operations, proxies the rest to Node.
- **Owned operation**: a GraphQL operation name on `/graphql` or `/metadata` that Go answers.
- **Blocked operation**: a metadata mutation the front door rejects because the model is frozen.
- **Principal**: the authenticated caller, read from a Node-issued access token.
- **Pinned workspace**: the single workspace, fixed UUID, schema name derived once.
- **Object model**: the generated, build-time description of one object and its columns.
- **Record filter**: Twenty's GraphQL filter tree, compiled to SQL over whitelisted columns.

**New**

```go
// internal/config/config.go
type Config struct {
	ListenAddr      string
	DatabaseURL     string
	NodeUpstreamURL *url.URL
	LogLevel        slog.Level
}
```

```go
// internal/workspace/workspace.go
const PinnedWorkspaceID = "<current workspace UUID>"

func SchemaName() string // "workspace_" + base36(PinnedWorkspaceID), matching getWorkspaceSchemaName
```

```go
// internal/frontdoor/operations.go
type Endpoint string

const (
	EndpointWorkspace Endpoint = "/graphql"
	EndpointMetadata  Endpoint = "/metadata"
)

type Route string

const (
	RouteGo      Route = "go"
	RouteNode    Route = "node"
	RouteBlocked Route = "blocked"
)

type OperationTable map[Endpoint]map[string]Route // operation name → route; absent means RouteNode
```

```go
// internal/auth/principal.go
type AuthProvider string // mirrors Node's AuthProviderEnum values

type Principal struct {
	UserID            string
	WorkspaceID       string
	UserWorkspaceID   string
	WorkspaceMemberID string
	AuthProvider      AuthProvider
}

type Verifier interface {
	Verify(ctx context.Context, bearer string) (Principal, error) // ES256 by kid from core."signingKey", HS256 legacy
}

var ErrUnauthenticated = errors.New("unauthenticated")
```

```go
// internal/model/model.go  (written by go generate from a migrated database)
type FieldType string // TEXT, NUMBER, BOOLEAN, DATE_TIME, SELECT, MULTI_SELECT, FULL_NAME, EMAILS, PHONES, LINKS, CURRENCY, ADDRESS, ACTOR, RELATION, UUID, POSITION, RAW_JSON, RICH_TEXT, TS_VECTOR

type Column struct {
	Name     string // physical column, e.g. "nameFirstName"
	SubField string // composite subfield, e.g. "firstName"; empty for scalar fields
}

type Field struct {
	Name    string
	Type    FieldType
	Columns []Column
	Options []string // SELECT and MULTI_SELECT values
}

type Object struct {
	NameSingular string
	NamePlural   string
	Table        string
	Fields       []Field
}
```

```go
// internal/records/filter.go
type Operand string // eq, neq, in, is, gt, gte, lt, lte, like, ilike, startsWith, containsAny, containsIlike

type FieldFilter struct {
	Field    string
	SubField string
	Operand  Operand
	Value    any
}

type Filter struct {
	And   []Filter
	Or    []Filter
	Not   *Filter
	Field *FieldFilter
}

type OrderDirection string // AscNullsFirst, AscNullsLast, DescNullsFirst, DescNullsLast

type OrderBy struct {
	Field     string
	SubField  string
	Direction OrderDirection
}

type PageRequest struct {
	First  int
	After  string
	Last   int
	Before string
}

type Page[TRecord any] struct {
	Records     []TRecord
	TotalCount  int
	StartCursor string
	EndCursor   string
	HasNext     bool
	HasPrevious bool
}

var ErrUnknownField = errors.New("unknown field") // filter or sort names a column not in the object model
```

```go
// internal/records/person.go
type FullName struct{ FirstName, LastName string }
type Emails struct{ PrimaryEmail string; AdditionalEmails []string }
type Link struct{ Label, URL string }
type Links struct{ PrimaryLink Link; SecondaryLinks []Link }
type Phone struct{ Number, CountryCode, CallingCode string }
type Phones struct{ Primary Phone; Additional []Phone }
type Actor struct{ Source, WorkspaceMemberID, Name string }

type Person struct {
	ID        string
	Name      FullName
	Emails    Emails
	Linkedin  Links
	JobTitle  string
	Phones    Phones
	AvatarURL string
	Position  float64
	CompanyID *string
	CreatedBy Actor
	UpdatedBy Actor
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}

type PersonInput struct { // nil leaves a field unchanged on update
	Name      *FullName
	Emails    *Emails
	Linkedin  *Links
	JobTitle  *string
	Phones    *Phones
	CompanyID *string
}

type People interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[Person], error)
	Get(ctx context.Context, id string) (Person, error) // ErrNotFound
	Create(ctx context.Context, actor Actor, input PersonInput) (Person, error)
	Update(ctx context.Context, actor Actor, id string, input PersonInput) (Person, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
}

var ErrNotFound = errors.New("record not found")
```

## Phase 2: All records on Go

Journeys: J5

**Glossary**

- **Aggregate**: a per-field summary over a filtered set (count, sum, min, max, avg, percent empty).
- **Group**: records bucketed by a SELECT or relation field, each with its aggregates.
- **View**: a saved list setup (fields, filters, sorts, groups) from `core."view*"`.

**New**

```go
// internal/records/aggregate.go
type AggregateOperation string // count, countEmpty, countNotEmpty, countUniqueValues, percentageEmpty, percentageNotEmpty, sum, avg, min, max, countTrue, countFalse

type Aggregate struct {
	Field     string
	Operation AggregateOperation
}

type AggregateResult map[string]any // "<operation><Field>" → value, as Node names them

type GroupBy struct {
	Field    string
	SubField string
}

type Group[TRecord any] struct {
	Key        []any
	Records    Page[TRecord]
	Aggregates AggregateResult
}
```

```go
// internal/records/<object>.go  (one per standard object: Company, Opportunity, Note, Task, TimelineActivity,
// Attachment, WorkspaceMember, Dashboard, and their target join objects; same shape as People)
type Companies interface {
	Find(ctx context.Context, filter Filter, orderBy []OrderBy, page PageRequest) (Page[Company], error)
	Get(ctx context.Context, id string) (Company, error)
	Create(ctx context.Context, actor Actor, input CompanyInput) (Company, error)
	Update(ctx context.Context, actor Actor, id string, input CompanyInput) (Company, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[Company], error)
}
```

```go
// internal/metadata/metadata.go
type ObjectMetadata struct {
	ID, NameSingular, NamePlural, LabelSingular, LabelPlural, Icon string
	IsCustom, IsActive, IsSystem                                   bool
	Fields                                                          []FieldMetadata
}

type FieldMetadata struct {
	ID, Name, Label, Icon string
	Type                  model.FieldType
	IsNullable, IsActive  bool
	Settings, Options     json.RawMessage
	Relation              *RelationMetadata
}

type RelationMetadata struct {
	Type                     string // MANY_TO_ONE, ONE_TO_MANY
	TargetObjectMetadataID   string
	TargetFieldMetadataID    string
}

type View struct {
	ID, ObjectMetadataID, Name, Type, Icon string
	Position                               float64
	Fields                                 []ViewField
	Filters                                []ViewFilter
	FilterGroups                           []ViewFilterGroup
	Sorts                                  []ViewSort
	Groups                                 []ViewGroup
}

type Reader interface {
	Objects(ctx context.Context) ([]ObjectMetadata, error)
	Views(ctx context.Context, objectMetadataID string) ([]View, error)
}

type ViewWriter interface { // views stay user-editable; only objects and fields are frozen
	SaveView(ctx context.Context, view View) (View, error)
	DeleteView(ctx context.Context, id string) error
}
```

**Modified**

```go
// internal/records/person.go
type People interface {
	// Phase 1 methods, plus:
	Aggregate(ctx context.Context, filter Filter, aggregates []Aggregate) (AggregateResult, error)
	GroupBy(ctx context.Context, filter Filter, groupBy []GroupBy, orderBy []OrderBy, aggregates []Aggregate, perGroup PageRequest) ([]Group[Person], error)
}
```

## Phase 3: AI on Go

Journeys: J6, J7

**Glossary**

- **Model**: one LLM behind a provider SDK (Anthropic, or OpenAI and OpenAI-compatible APIs).
- **Tool**: a named, JSON-schema'd capability shared by the in-app agent and MCP.
- **Turn**: one user message and the agent loop that answers it, in an `agentChatThread`.
- **Chat event**: one AI SDK UI-message chunk, published on `onAgentChatEvent`.
- **Broker**: in-process fan-out of a turn's chat events to subscribers, with replay for catchup.
- **Mailer**: sends or drafts an email through a connected Google account; used by AI tools and, later, workflows.

**New**

```go
// internal/ai/model.go
type Provider string

const (
	ProviderAnthropic        Provider = "anthropic"
	ProviderOpenAI           Provider = "openai"
	ProviderOpenAICompatible Provider = "openai-compatible"
)

type Role string // system, user, assistant, tool

type Part struct {
	Type       string // text, reasoning, tool-call, tool-result
	Text       string
	ToolCallID string
	ToolName   string
	Input      json.RawMessage
	Output     json.RawMessage
}

type Message struct {
	Role  Role
	Parts []Part
}

type StreamEvent struct {
	Part  Part
	Delta string
	Done  bool
	Usage *Usage
}

type Usage struct{ InputTokens, OutputTokens int }

type Model interface {
	Stream(ctx context.Context, system string, messages []Message, tools []ToolSpec) iter.Seq2[StreamEvent, error]
}
```

```go
// internal/ai/tool.go
type ToolSpec struct {
	Name        string
	Description string
	InputSchema json.RawMessage
}

type Tool interface {
	Spec() ToolSpec
	Call(ctx context.Context, principal auth.Principal, input json.RawMessage) (json.RawMessage, error)
}

type Registry interface {
	Tools(ctx context.Context, principal auth.Principal) []Tool
	Lookup(name string) (Tool, bool)
}
```

```go
// internal/ai/chat.go
type ChatEvent struct {
	ThreadID string
	Event    json.RawMessage // AI SDK UI message chunk, as onAgentChatEvent sends it today
}

type Broker interface {
	Publish(threadID string, event ChatEvent)
	Subscribe(ctx context.Context, threadID string) <-chan ChatEvent
	Catchup(threadID string) []ChatEvent // events of the turn in flight; empty when idle
}

type Agent struct {
	ID, Name, Label, Prompt, ModelID string
	ResponseFormat                    json.RawMessage
	SkillIDs                          []string
}

type Skill struct {
	ID, Name, Label, Content string
}

type Runner interface { // shared by chat turns and, from phase 4, workflow agent steps
	Run(ctx context.Context, principal auth.Principal, agent Agent, messages []Message, emit func(ChatEvent)) ([]Message, error)
}
```

```go
// internal/messaging/mailer.go  (thin slice: sending only; sync and campaigns are phase 5)
type ConnectedAccount struct {
	ID, Handle, AccessToken, RefreshToken string
	Scopes                                []string
	AuthFailedAt                          *time.Time
}

type OutboundEmail struct {
	To, Cc, Bcc []string
	Subject     string
	HTMLBody    string
	InReplyTo   string
}

type Mailer interface { // Gmail API; refreshes the account's access token when it has expired
	Send(ctx context.Context, connectedAccountID string, email OutboundEmail) (messageID string, err error)
	Draft(ctx context.Context, connectedAccountID string, email OutboundEmail) (draftID string, err error)
}

var ErrAccountAuthFailed = errors.New("connected account needs reconnecting")
```

**Modified**

```go
// internal/auth/principal.go
type Principal struct {
	UserID            string
	WorkspaceID       string
	UserWorkspaceID   string
	WorkspaceMemberID string
	AuthProvider      AuthProvider
	APIKeyID          string // set for MCP and API-key callers, from core."apiKey"; user fields empty
}
```

## Phase 4: Workflows on Go

Journeys: J8

**Glossary**

- **Workflow run**: one execution of a `workflowVersion`, stored in `workflowRun` with its step states.
- **Trigger**: what starts a run: a database event, a cron schedule, a manual launch or a webhook.
- **Record event**: created, updated, deleted or restored, enqueued by `records` in the write's transaction.
- **Action**: one step type the run executes.

**New**

```go
// internal/workflow/workflow.go
type RunStatus string // NOT_STARTED, RUNNING, COMPLETED, FAILED, ENQUEUED, STOPPING, STOPPED

type ActionType string // CODE is absent; CLASSIFY, AI_AGENT, SEND_EMAIL, DRAFT_EMAIL, CREATE_RECORD, UPDATE_RECORD, DELETE_RECORD, UPSERT_RECORD, FIND_RECORDS, FORM, FILTER, IF_ELSE, ITERATOR, DELAY, HTTP_REQUEST, EMPTY

type StepInput struct {
	RunID    string
	StepID   string
	Settings json.RawMessage
	Context  map[string]any // outputs of earlier steps, keyed by step id, plus the trigger payload
}

type StepOutput struct {
	Result  any
	Error   string
	Pending bool // FORM and DELAY park the run until resumed
}

type Action interface {
	Type() ActionType
	Run(ctx context.Context, input StepInput) (StepOutput, error)
}

```

SEND_EMAIL and DRAFT_EMAIL call `messaging.Mailer` from phase 3.

```go
// internal/workflow/jobs.go  (River job args)
type RunWorkflowArgs struct {
	RunID string `json:"runId"`
}

type ResumeStepArgs struct {
	RunID  string          `json:"runId"`
	StepID string          `json:"stepId"`
	Input  json.RawMessage `json:"input"`
}

type CronTriggerArgs struct {
	TriggerID string `json:"triggerId"`
}
```

```go
// internal/records/events.go
type EventKind string // created, updated, deleted, restored, destroyed

type RecordEvent struct {
	Object   string
	Kind     EventKind
	RecordID string
	Before   json.RawMessage
	After    json.RawMessage
	Actor    Actor
}

type RecordEventArgs struct { // River job, enqueued in the record write's transaction
	Event RecordEvent `json:"event"`
}
```

## Phase 5: Messaging on Go

Journeys: J9

**Glossary**

- **Connected account**: a Google account in `core."connectedAccount"` with OAuth tokens.
- **Message channel / calendar channel**: a connected account's mail or calendar sync stream and its cursor.
- **Campaign**: a `messageCampaign` sent to a `messageList`, one `campaignDelivery` per recipient.
- **Suppression**: an address that must not be mailed (`messageSuppression`, `blocklist`).

**New**

```go
// internal/messaging/sync.go
type SyncCursor string // Gmail historyId or Calendar syncToken

type ImportedMessage struct {
	ExternalID, ThreadExternalID, Subject, Text, HTML string
	From                                             string
	To, Cc, Bcc                                      []string
	ReceivedAt                                       time.Time
	Direction                                        string // INCOMING, OUTGOING
	Labels                                           []string
}

type ImportedEvent struct {
	ExternalID, Title, Description, Location, ConferenceLink string
	StartsAt, EndsAt                                         time.Time
	IsCanceled, IsFullDay                                    bool
	Participants                                             []string
}

type MailSource interface { // Gmail history API
	ListChanges(ctx context.Context, account ConnectedAccount, since SyncCursor) (ids []string, next SyncCursor, err error)
	FetchMessages(ctx context.Context, account ConnectedAccount, ids []string) ([]ImportedMessage, error)
}

type CalendarSource interface { // Google Calendar events API
	ListChanges(ctx context.Context, account ConnectedAccount, since SyncCursor) ([]ImportedEvent, SyncCursor, error)
}

var ErrSyncCursorExpired = errors.New("sync cursor expired") // full resync required
```

```go
// internal/messaging/jobs.go  (River job args)
type SyncMessageChannelArgs struct{ ChannelID string `json:"channelId"` }
type SyncCalendarChannelArgs struct{ ChannelID string `json:"channelId"` }
type SendCampaignArgs struct{ CampaignID string `json:"campaignId"` }
type DeliverCampaignMessageArgs struct{ DeliveryID string `json:"deliveryId"` }
```

```go
// internal/messaging/campaign.go
type DeliveryStatus string // mirrors campaignDelivery's status enum

type Renderer interface { // twenty-emails templates; implementation chosen in this phase (PRD open question)
	Render(ctx context.Context, template string, variables map[string]any) (html, text string, err error)
}
```

## Phase 6: Auth on Go

Journeys: J10

**Glossary**

- **Refresh token**: a long-lived token in `core."appToken"` exchanged for a new access token.
- **Login token**: the short-lived token between credential check and the 2FA or workspace step.
- **TOTP method**: a user's `core."twoFactorAuthenticationMethod"` with an otplib hex-encoded secret.

**New**

```go
// internal/auth/tokens.go
type TokenType string // ACCESS, REFRESH, LOGIN, FILE, API_KEY, as JwtTokenTypeEnum

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
}

type Issuer interface { // ES256 with the current core."signingKey", same claims as Node
	IssueAccess(ctx context.Context, principal Principal) (string, time.Time, error)
	IssueLogin(ctx context.Context, userID string) (string, error)
	Refresh(ctx context.Context, refreshToken string) (TokenPair, error)
	Revoke(ctx context.Context, refreshToken string) error
	IssueLoginToken(ctx context.Context, userID, workspaceID string, provider AuthProvider) (string, error)
	VerifyLoginToken(ctx context.Context, loginToken string) (LoginClaims, error)
	ConsumeLoginToken(ctx context.Context, login LoginClaims) error // marker shared with Node in Redis, ADR 0002
	IssueWorkspaceAgnostic(ctx context.Context, userID string, provider AuthProvider) (TokenPair, error)
	// Refresh also rotates workspace-agnostic refresh tokens.
}

type LoginClaims struct {
	Email        string // the token's sub claim
	WorkspaceID  string
	AuthProvider AuthProvider
	ID           string // jti
}

var (
	ErrInvalidLoginToken  = errors.New("auth: invalid login token")
	ErrLoginTokenConsumed = errors.New("auth: login token already used")
)

// internal/auth/cachestore.go
type CacheStore interface { // Node's Redis namespace engine:auth-session
	SetIfAbsent(ctx context.Context, key string, ttl time.Duration) (bool, error)
	Delete(ctx context.Context, keys ...string) error
}

func NewRedisCache(client redis.Cmdable, keyPrefix string) *RedisCache // keyPrefix is REDIS_CACHE_PREFIX

// internal/auth/usersession.go
type SessionOrigin string // SessionOriginSignIn, SessionOriginRenewalBridge

type UserSession struct{ /* core."userSession", the twenty-session cookie */ }

func NewUserSession(pool *pgxpool.Pool, cache CacheStore, revoker RefreshRevoker, config SessionConfig, logger *slog.Logger) *UserSession
func (s *UserSession) IssueForTokenPair(ctx context.Context, w http.ResponseWriter, r *http.Request, pair TokenPair, origin SessionOrigin) error
func (s *UserSession) SignOut(ctx context.Context, w http.ResponseWriter, r *http.Request, refreshToken string) error

var (
	ErrSessionOriginForbidden = errors.New("auth: request origin may not receive a session cookie")
	ErrInvalidSessionTokens   = errors.New("auth: cannot issue a session from this token pair")
)

type SessionConfig struct {
	ServerURL, FrontendURL string
	CookieAllowedOrigins   []string
	Production, TrustProxy bool
	SameSite               http.SameSite
	AbsoluteLifetime       time.Duration // SESSION_ABSOLUTE_LIFETIME
	IdleTimeout            time.Duration // SESSION_IDLE_TIMEOUT
}

type RefreshRevoker interface{ Revoke(ctx context.Context, refreshToken string) error } // the Issuer

type OriginConfig struct {
	MultiWorkspace             bool
	FrontURL, DefaultSubdomain string
	SeedWorkspaceID            string
}

type OriginWorkspace struct{ ID, Subdomain string }

// IssuerConfig gains Cache CacheStore (required by ConsumeLoginToken) and WorkspaceAgnosticTTL.

// internal/auth/sessionsecrets.go
func ResolveSessionCookieSecrets(encryptionKey, fallbackEncryptionKey, appSecret string) ([]string, error)

// internal/auth/workspaceorigin.go, as getWorkspaceByOriginOrDefaultWorkspace (custom domains are gone from this fork)
func NewOriginResolver(pool *pgxpool.Pool, config OriginConfig) *OriginResolver
func (r *OriginResolver) ByOriginOrDefault(ctx context.Context, origin string) (OriginWorkspace, error) // ErrWorkspaceNotFound

// internal/auth/twofactor.go; per-workspace secret decryption is SecretCipher.Decrypt(envelope, workspaceID)
type TwoFactorRequirement string // TwoFactorNotRequired, TwoFactorVerifyRequired, TwoFactorProvisionRequired
func (s *TwoFactor) Requirement(ctx context.Context, userID, workspaceID string) (TwoFactorRequirement, error)

// internal/frontdoor/handler.go
func (h *Handler) WithPublicOperations(operations map[Endpoint][]string) *Handler // bearer-less RouteGo operations

type PasswordHasher interface { // bcrypt, compatible with hashes Node wrote
	Hash(password string) (string, error)
	Compare(hash, password string) error
}

type TOTP interface {
	Verify(secretHex, code string) bool
	Generate() (secretHex, otpauthURL string, err error)
}

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTwoFactorRequired  = errors.New("two-factor authentication required")
)
```

## Phase 7: Node removed

Journeys: J11

**Modified**

```go
// internal/config/config.go
type Config struct {
	ListenAddr  string
	DatabaseURL string
	LogLevel    slog.Level
}
```

The `frontdoor` package's proxy and `OperationTable` go with `packages/twenty-server`; nothing new is defined.

## Notes

- Only goose migrations change the schema. A migration touching workspace tables writes the matching `objectMetadata`/`fieldMetadata` rows in the same file and is followed by Node's `cache:flush` until phase 7. `go generate` then refreshes `internal/model`, the SDL and the sqlc queries; CI fails on a diff.
- An operation is `RouteGo` only once its golden test matches Node's JSON. Object and field create, update and delete mutations are `RouteBlocked` from phase 1; the Data model pages become read-only in the front end in the same phase.
- `records` serves reads and user edits for every `workspace_*` object, including messages and calendar events (the AI email and calendar read tools use it); `metadata` owns `core` metadata and view tables; `ai` owns the agent chat tables; `workflow` owns `workflow*` tables; `messaging` is the only writer of message, calendar and campaign rows from sync and sending, and owns connected accounts; `auth` owns users, sessions, tokens, signing keys and API keys. Cross-module calls go through the interfaces above.
- Chat runs in `cmd/api` (the broker is in-process); workflow agent steps run the same `ai.Runner` in `cmd/worker`.
- ENUM columns stay ENUMs until phase 7; a table converts to text + CHECK only once Node no longer touches it.
- Call recording (`callRecording`) and onboarding invite suggestions are removed from Node and recorded in `docs/removed-app-platform.md` before the baseline is squashed.

### PRD drift

- Slice 3 chat transport: the PRD said SSE in the HTTP request → Go serves the existing start mutation, `onAgentChatEvent` subscription and catchup query through an in-process broker. Edited in PRD.
- Slices 3 and 5: the AI send-email tool and the workflow email actions need Gmail sending, which the PRD put in slice 5 → a thin `messaging` slice (connected accounts, token refresh, `Mailer`) lands in phase 3; phase 5 keeps sync, campaigns and webhooks. Edited in PRD.
