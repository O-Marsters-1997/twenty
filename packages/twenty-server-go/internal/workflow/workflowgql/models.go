package workflowgql

type StepPosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type WorkflowAction struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Type        string        `json:"type"`
	Settings    any           `json:"settings"`
	Valid       bool          `json:"valid"`
	NextStepIDs []string      `json:"nextStepIds"`
	Position    *StepPosition `json:"position"`
}

type HTTPTestResult struct {
	Success    bool
	Message    string
	Result     any
	Error      any
	Status     *float64
	StatusText *string
	Headers    any
}
