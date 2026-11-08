package recordsgql

import "github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"

func toLinks(links records.Links) *Links {
	secondary := make([]*SecondaryLink, len(links.SecondaryLinks))
	for i, link := range links.SecondaryLinks {
		secondary[i] = &SecondaryLink{Label: &link.Label, URL: &link.URL}
	}
	return &Links{PrimaryLinkLabel: &links.PrimaryLink.Label, PrimaryLinkURL: &links.PrimaryLink.URL, SecondaryLinks: secondary}
}

func toCurrency(currency records.Currency) *Currency {
	return &Currency{AmountMicros: currency.AmountMicros, CurrencyCode: &currency.CurrencyCode}
}

func toCompany(company records.Company) *Company {
	address := company.Address
	return &Company{
		ID:         company.ID,
		Name:       &company.Name,
		DomainName: toLinks(company.DomainName),
		Address: &Address{
			AddressStreet1: &address.Street1, AddressStreet2: &address.Street2, AddressCity: &address.City,
			AddressPostcode: &address.Postcode, AddressState: &address.State, AddressCountry: &address.Country,
			AddressLat: address.Lat, AddressLng: address.Lng,
		},
		LinkedinLink:   toLinks(company.Linkedin),
		AnnualRevenue:  toCurrency(company.AnnualRevenue),
		AccountOwnerID: company.AccountOwnerID,
		Position:       company.Position,
		CreatedBy:      toActor(company.CreatedBy),
		UpdatedBy:      toActor(company.UpdatedBy),
		CreatedAt:      company.CreatedAt,
		UpdatedAt:      company.UpdatedAt,
		DeletedAt:      company.DeletedAt,
	}
}

func toOpportunity(opportunity records.Opportunity) *Opportunity {
	stage := OpportunityStageEnum(opportunity.Stage)
	return &Opportunity{
		ID:               opportunity.ID,
		Name:             &opportunity.Name,
		Amount:           toCurrency(opportunity.Amount),
		CloseDate:        opportunity.CloseDate,
		Stage:            &stage,
		CompanyID:        opportunity.CompanyID,
		PointOfContactID: opportunity.PointOfContactID,
		OwnerID:          opportunity.OwnerID,
		Position:         opportunity.Position,
		CreatedBy:        toActor(opportunity.CreatedBy),
		UpdatedBy:        toActor(opportunity.UpdatedBy),
		CreatedAt:        opportunity.CreatedAt,
		UpdatedAt:        opportunity.UpdatedAt,
		DeletedAt:        opportunity.DeletedAt,
	}
}

func companyEdges(page records.Page[records.Company]) []*CompanyEdge {
	edges := make([]*CompanyEdge, len(page.Records))
	for i, company := range page.Records {
		edges[i] = &CompanyEdge{Node: toCompany(company), Cursor: records.Cursor(company.ID)}
	}
	return edges
}

func opportunityEdges(page records.Page[records.Opportunity]) []*OpportunityEdge {
	edges := make([]*OpportunityEdge, len(page.Records))
	for i, opportunity := range page.Records {
		edges[i] = &OpportunityEdge{Node: toOpportunity(opportunity), Cursor: records.Cursor(opportunity.ID)}
	}
	return edges
}
