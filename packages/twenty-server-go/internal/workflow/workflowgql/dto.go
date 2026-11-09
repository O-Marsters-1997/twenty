package workflowgql

type DeletedWorkflowDTO struct {
	ID                  string
	WorkspaceWorkflowID *string
}

type StepChangesDTO struct {
	TriggerDiff any
	StepsDiff   any
}

type TriggerDTO struct {
	Trigger any
}
