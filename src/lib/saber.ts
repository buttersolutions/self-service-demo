const API_KEY = process.env.SABER_API_KEY!;
const BASE = "https://api.saber.app/v1";

// --- Types ---

interface SaberSignalRequest {
  domain: string;
  question: string;
  answerType: "open_text" | "boolean" | "number" | "list";
}

interface SaberSource {
  url: string;
  title: string;
  snippet: string;
}

interface SaberSignalResponse {
  id: string;
  status: "completed" | "processing" | "failed";
  question: string;
  answer?: {
    type: string;
    openText?: { value: string };
    number?: { value: number };
    boolean?: { value: boolean };
    list?: { value: string[] };
  };
  reasoning?: string;
  confidence?: number;
  sources?: SaberSource[];
  error?: string;
}

export interface SignalDef {
  label: string;
  question: string;
  answerType: "open_text" | "number" | "list" | "boolean";
}

export interface CompanyInsight {
  label: string;
  question: string;
  answer: string | number | boolean | string[] | null;
  answerType: string;
  reasoning?: string;
  confidence?: number;
  sources?: SaberSource[];
  durationMs?: number;
  error?: string;
}

// --- Signal definitions ---

export const DEMO_SIGNALS: SignalDef[] = [
  {
    label: "Business Description",
    question:
      "Provide a detailed description of this company's business — what they do, who they serve, what makes them distinctive, and where they operate. Do not truncate or abbreviate the answer.",
    answerType: "open_text",
  },
  {
    label: "Business Vertical",
    question:
      "What specific industry vertical or business type is this company? Be specific (e.g., fast-casual restaurant, boutique fitness studio, dental practice, coffee shop chain). Return only the category.",
    answerType: "open_text",
  },
  {
    label: "Years in Operation",
    question: "How many years has this company been in operation?",
    answerType: "number",
  },
  {
    label: "Number of Locations",
    question:
      "How many physical locations (stores, offices, branches) does this company operate?",
    answerType: "number",
  },
  {
    label: "Target Audience",
    question:
      "Describe this company's target audience and typical customer profile. Include demographics, preferences, and what draws customers to this business. Do not truncate or abbreviate the answer.",
    answerType: "open_text",
  },
  {
    label: "Competitive Advantages",
    question:
      "What are this company's key competitive advantages or unique selling points compared to others in the same space? List the top 3-5 differentiators.",
    answerType: "list",
  },
  {
    label: "News Coverage",
    question:
      "What are the most notable recent news stories or press coverage about this company? List up to 5 items with publication and headline.",
    answerType: "list",
  },
  {
    label: "Review Sentiment",
    question:
      "Analyze the overall sentiment in customer reviews for this company. Focus on recurring themes around customer experience — service quality, wait times, staff, cleanliness, value for money. Summarise key positives and negatives. Do not truncate or abbreviate the answer.",
    answerType: "open_text",
  },
  {
    label: "Growth Indicators",
    question:
      "List any evidence of growth in the last 12 months: job postings, new location openings, planned expansions, fundraising, press about growth. Be specific with dates and details.",
    answerType: "list",
  },
];

export const DATA_TEST_SIGNALS: SignalDef[] = [
  {
    label: "Business Vertical",
    question:
      "What specific industry vertical or business type is this company? Be specific (e.g., fast-casual restaurant, boutique fitness studio, dental practice, coffee shop chain). Return only the category.",
    answerType: "open_text",
  },
  {
    label: "Business Description",
    question:
      "Provide a detailed description of this company's business — what they do, who they serve, what makes them distinctive, and where they operate. Do not truncate or abbreviate the answer.",
    answerType: "open_text",
  },
  {
    label: "Number of Locations",
    question:
      "How many physical locations (stores, restaurants, offices, branches) does this company currently operate?",
    answerType: "number",
  },
  {
    label: "Years in Operation",
    question: "How many years has this company been in operation? Return only the number.",
    answerType: "number",
  },
  {
    label: "Growth Indicators",
    question:
      "List any evidence of growth in the last 12 months: job postings, new location openings, planned expansions, fundraising, press about growth. Be specific with dates and details.",
    answerType: "list",
  },
  {
    label: "Growth Score",
    question:
      "On a scale of 0 to 50, rate this company's growth trajectory based on hiring activity, new locations, funding, and expansion signals. Return only the number.",
    answerType: "number",
  },
  {
    label: "News Coverage",
    question:
      "What are the most notable recent news stories or press coverage about this company? List up to 5 with publication name, headline, and date.",
    answerType: "list",
  },
];

// --- Core fetch ---

async function fetchSignal(
  req: SaberSignalRequest
): Promise<SaberSignalResponse> {
  const res = await fetch(`${BASE}/companies/signals/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "X-Sbr-Timeout-Sec": "120",
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Saber API error (${res.status}): ${text}`);
  }

  return res.json();
}

function extractAnswer(
  resp: SaberSignalResponse
): string | number | boolean | string[] | null {
  if (resp.status !== "completed" || !resp.answer) return null;

  switch (resp.answer.type) {
    case "open_text":
      return resp.answer.openText?.value ?? null;
    case "number":
      return resp.answer.number?.value ?? null;
    case "boolean":
      return resp.answer.boolean?.value ?? null;
    case "list":
      return resp.answer.list?.value ?? null;
    default:
      return null;
  }
}

// --- Public API ---

export async function fetchSignals(
  domain: string,
  signals: SignalDef[]
): Promise<CompanyInsight[]> {
  const results = await Promise.allSettled(
    signals.map(async (signal) => {
      const start = Date.now();
      const resp = await fetchSignal({
        domain,
        question: signal.question,
        answerType: signal.answerType,
      });

      return {
        label: signal.label,
        question: signal.question,
        answer: extractAnswer(resp),
        answerType: signal.answerType,
        reasoning: resp.reasoning,
        confidence: resp.confidence,
        sources: resp.sources,
        durationMs: Date.now() - start,
      } satisfies CompanyInsight;
    })
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      label: signals[i].label,
      question: signals[i].question,
      answer: null,
      answerType: signals[i].answerType,
      error: r.reason?.message ?? "Signal failed",
    };
  });
}

/** Used by the demo flow insights page */
export async function getCompanyInsights(
  domain: string
): Promise<CompanyInsight[]> {
  return fetchSignals(domain, DEMO_SIGNALS);
}
