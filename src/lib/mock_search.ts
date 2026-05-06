export type SearchHit = {
  id: string;
  displayName: string;
  maskedPhone: string;
  maskedCr: string;
  region: string;
  hasEvidence: boolean;
  evidenceFeeCents: number;
};

export const MOCK_SEARCH_HITS: SearchHit[] = [
  {
    id: "rep-001",
    displayName: "Al-Rashid Trading LLC",
    maskedPhone: "+966 ••• ••89",
    maskedCr: "CR ••••7821",
    region: "Riyadh",
    hasEvidence: true,
    evidenceFeeCents: 4900,
  },
  {
    id: "rep-002",
    displayName: "Unnamed individual",
    maskedPhone: "+20 ••• ••45",
    maskedCr: "—",
    region: "Cairo",
    hasEvidence: true,
    evidenceFeeCents: 2900,
  },
  {
    id: "rep-003",
    displayName: "Delta Logistics Co.",
    maskedPhone: "+971 ••• ••12",
    maskedCr: "CR ••••0092",
    region: "Dubai",
    hasEvidence: false,
    evidenceFeeCents: 0,
  },
];
