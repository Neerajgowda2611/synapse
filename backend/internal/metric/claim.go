package metric

const (
	convergentMin      = 0.30
	discriminantMargin = 0.10
)

var scalarLevels = map[string]struct{}{
	"scalar": {},
	"strict": {},
}

func (c ConstructClaim) Status() ValidationStatus {
	e := c.Evidence
	if e.ConvergentR == nil {
		return ValidationStatusCandidate
	}
	convergentOK := *e.ConvergentR >= convergentMin
	discriminantOK := true
	if e.DiscriminantMaxR != nil {
		discriminantOK = (*e.ConvergentR - *e.DiscriminantMaxR) >= discriminantMargin
	}
	if !convergentOK || !discriminantOK {
		return ValidationStatusCandidate
	}
	level := ""
	if e.InvarianceLevel != nil {
		level = *e.InvarianceLevel
	}
	_, scalar := scalarLevels[level]
	if scalar && e.DIFChecked && len(e.DIFFlags) == 0 {
		return ValidationStatusSurfaced
	}
	return ValidationStatusValidated
}
