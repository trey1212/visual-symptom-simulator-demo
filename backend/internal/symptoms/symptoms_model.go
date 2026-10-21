package symptoms

type Symptom struct {
	Key          string `json:"key" db:"key"`
	ClinicalName string `json:"clinical_name" db:"clinical_name"`
	PlainName    string `json:"plain_name" db:"plain_name"`
	Drawable     bool   `json:"drawable" db:"drawable"`
}