package workflowgql

type WorkflowDTO struct {
	ID                                 string
	Name                               *string
	Statuses                           []string
	LastPublishedVersionID             *string
	LastPublishedCoreWorkflowVersionID *string
	ApplicationID                      *string
	WorkspaceWorkflowID                *string
	IsSystem                           bool
	Visibility                         string
	CanChangeVisibility                bool
	CreatedAt                          string
	UpdatedAt                          string
}

type DeletedWorkflowDTO struct {
	ID                  string
	WorkspaceWorkflowID *string
}

type VersionDTO struct {
	ID                         string
	CoreWorkflowID             *string
	Label                      string
	Status                     string
	WorkspaceWorkflowVersionID *string
	WorkspaceWorkflowID        *string
	Trigger                    any
	Steps                      any
	CreatedAt                  string
	UpdatedAt                  string
}

type StepChangesDTO struct {
	TriggerDiff any
	StepsDiff   any
}

type PositionDTO struct {
	X float64
	Y float64
}

type ActionDTO struct {
	ID          string
	Name        string
	Type        string
	Settings    any
	Valid       bool
	NextStepIDs []string
	Position    *PositionDTO
}

type TriggerDTO struct {
	Trigger any
}
