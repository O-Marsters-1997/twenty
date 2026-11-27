package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"slices"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/accessgql"
	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/agentgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/aigql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/skillgql"
	aistore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/applicationgql"
	applicationstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth/authgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/files/filesgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/invitation/invitationgql"
	invitationstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/invitation/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/messaginggql"
	messagingstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/metadatagql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/metagql"
	metadatastore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/onboarding"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/onboarding/onboardinggql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pagelayout/pagelayoutgql"
	pagelayoutstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/pagelayout/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/recordsgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	workflowstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/workflowgql"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "api:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	logger := slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: cfg.LogLevel}))

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open database pool: %w", err)
	}
	defer pool.Close()
	verifier := auth.NewJWTVerifier(pool, cfg.AppSecret)
	stack, err := newAuthStack(pool, cfg, logger)
	if err != nil {
		return err
	}
	passwordLogins, err := passwordLogin(pool, cfg, stack)
	if err != nil {
		return err
	}

	fileSvc, err := fileService(pool, stack)
	if err != nil {
		return err
	}

	chats := aistore.New(pool)
	broker := ai.NewPersistingBroker(ai.NewMemoryBroker(), chats, logger)

	insertClient, err := river.NewClient(riverpgxv5.New(pool), &river.Config{})
	if err != nil {
		return fmt.Errorf("create river insert client: %w", err)
	}
	people := store.NewPeople(pool).WithEvents(records.NewRiverPublisher(insertClient))

	recordTools := ai.NewRecordTools(
		store.NewCompanies(pool), people, store.NewOpportunities(pool), store.NewNotes(pool), store.NewTasks(pool),
	)
	toolRegistry := ai.NewRegistry(recordTools...)
	runner, err := chatRunner(toolRegistry, logger)
	if err != nil {
		return err
	}
	chatHandler := aigql.NewHandler(chats, broker, ai.NewChatService(chats, runner, broker, logger), logger)

	queue, err := newWorkflowQueue(pool)
	if err != nil {
		return err
	}
	workflowHandler := workflowgql.NewHandler(&workflowgql.Resolver{
		Store:      workflowstore.New(pool),
		Authoring:  workflowAuthoring(pool),
		Queue:      queue,
		HTTPClient: workflowgql.NewSafeHTTPClient(),
	}, logger)

	twoFactor := auth.NewTwoFactor(
		pool, auth.NewSecretCipher(cfg.EncryptionKey, cfg.FallbackEncryptionKey, cfg.AppSecret), cfg.RecoveryCodeTTL,
	)
	authHandler := authgql.NewHandler(newAuthResolver(pool, cfg, twoFactor, passwordLogins, stack), logger)

	goGraphQL := http.NewServeMux()
	goGraphQL.Handle(string(frontdoor.EndpointWorkspace), workspaceHandler(recordsgql.NewHandler(&recordsgql.Resolver{
		Store:              people,
		Companies:          store.NewCompanies(pool),
		Opportunities:      store.NewOpportunities(pool),
		WorkspaceMembers:   store.NewWorkspaceMembers(pool),
		Dashboards:         store.NewDashboards(pool),
		TimelineActivities: store.NewTimelineActivities(pool),
		Attachments:        store.NewAttachments(pool),
		Notes:              store.NewNotes(pool),
		NoteTargets:        store.NewNoteTargets(pool),
		Tasks:              store.NewTasks(pool),
		TaskTargets:        store.NewTaskTargets(pool),
		Searcher:           store.NewSearch(pool),
	}, logger), chatHandler, workflowHandler, messaginggql.NewHandler(&messaginggql.Resolver{
		Timeline: messagingstore.NewTimeline(pool),
		Banners:  messagingstore.NewReconnectBanners(pool),
	}, logger), authHandler))
	goGraphQL.Handle(string(frontdoor.EndpointMetadata), metadataHandler(
		metadatagql.NewHandler(metadatastore.New(pool), toolRegistry, logger),
		chatHandler,
		skillgql.NewHandler(ai.NewSkills(pool), logger),
		metagql.NewHandler(metadatastore.NewViews(pool), logger),
		agentgql.NewHandler(aistore.NewAgents(pool), aistore.NewRuns(pool), logger),
		messaginggql.NewHandler(&messaginggql.Resolver{
			Channels:  messagingstore.NewChannels(pool, os.Getenv("INBOUND_EMAIL_DOMAIN")),
			Campaigns: messagingstore.NewCampaigns(pool),
			Renderer:  messaging.GoRenderer{},
			Queue:     queue.Enqueue,
			Outreach:  messagingstore.NewOutreach(pool),

			CalendarChannels: messagingstore.NewCalendarChannels(pool),
		}, logger),
		accessgql.NewHandler(&accessgql.Resolver{
			WebhookStore: accessstore.NewWebhooks(pool),
			APIKeyStore:  accessstore.NewAPIKeys(pool),
			RoleStore:    accessstore.NewRoles(pool),
			Permissions:  accessstore.NewPermissions(pool),
			Tokens:       stack.issuer,
		}, logger),
		authHandler,
		workspaceSettingsHandler(pool, cfg, passwordLogins, logger),
		invitationgql.NewHandler(&invitationgql.Resolver{
			Store:    invitationstore.New(pool),
			Tokens:   stack.issuer,
			Sender:   systemmail.NewSMTPSender(smtpConfigFromEnv()),
			FrontURL: stack.frontURL,
		}, logger),
		pagelayoutgql.NewHandler(&pagelayoutgql.Resolver{Store: pagelayoutstore.New(pool)}, logger),
		applicationgql.NewHandler(&applicationgql.Resolver{Store: applicationstore.New(pool, cfg.ServerURL)}, logger),
		filesgql.NewHandler(&filesgql.Resolver{Files: fileSvc}, logger),
		onboardinggql.NewHandler(&onboardinggql.Resolver{Store: onboarding.New(pool)}, logger),
		agentgql.Operations,
	))

	handler := frontdoor.NewHandler(verifier, goGraphQL, logger).
		WithPublicOperations(map[frontdoor.Endpoint][]string{
			frontdoor.EndpointMetadata:  slices.Concat(frontdoor.SessionOperations, frontdoor.PasswordLoginOperations, frontdoor.PublicWorkspaceOperations),
			frontdoor.EndpointWorkspace: frontdoor.LoginOperations,
		}).
		WithMCP(toolRegistry).
		WithSubscriber(aigql.NewSubscriber(broker))

	launcher := &workflow.Launcher{Store: workflowstore.New(pool), Queue: queue.Enqueue}

	routes, err := googleRoutes(pool, cfg.AppSecret, fileSvc.Handler(webhookRoutes(launcher, handler, logger), logger), logger)
	if err != nil {
		return err
	}

	server := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           routes,
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() { serveErr <- server.ListenAndServe() }()
	logger.Info("front door listening", "addr", cfg.ListenAddr)

	select {
	case err := <-serveErr:
		return fmt.Errorf("serve: %w", err)
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}
