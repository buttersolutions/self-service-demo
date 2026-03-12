const API_KEY = process.env.WATERFALL_API_KEY!;
const BASE = "https://api.waterfall.io/v1";

const headers = {
  "x-api-key": API_KEY,
  "Content-Type": "application/json",
};

// --- Types ---

export interface WaterfallCompany {
  domain?: string;
  name?: string;
  employees_count?: number;
  industry?: string;
  founded?: number;
  linkedin_url?: string;
  linkedin_followers?: number;
  address?: string;
  city?: string;
  country?: string;
  description?: string;
  funding_total?: number;
  crunchbase_url?: string;
}

export interface WaterfallPerson {
  first_name?: string;
  last_name?: string;
  title?: string;
  linkedin_url?: string;
  email?: string;
  email_verified?: boolean;
  phone?: string;
  location?: string;
  department?: string;
  seniority?: string;
}

interface JobResponse<T> {
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED_OUT" | "ABORTED";
  start_date: string;
  stop_date?: string;
  output?: T;
}

// --- Helpers ---

async function launchJob(
  endpoint: string,
  body: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Waterfall API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.job_id;
}

async function pollJob<T>(
  endpoint: string,
  jobId: string,
  maxWaitMs = 60000
): Promise<JobResponse<T>> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `${BASE}${endpoint}?job_id=${jobId}`,
      { headers }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Waterfall poll error (${res.status}): ${text}`);
    }

    const data: JobResponse<T> = await res.json();

    if (data.status !== "RUNNING") {
      return data;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("Waterfall job timed out waiting for results");
}

// --- Synchronous contact search ---

interface ContactSearchResponse {
  persons: WaterfallPerson[];
}

async function searchContacts(
  domain: string,
  titleFilters: string[],
  linkedinUrl?: string
): Promise<WaterfallPerson[]> {
  const body: Record<string, unknown> = {
    domain,
    title_filters: titleFilters.map((t) => ({ title: t })),
    page_size: 25,
  };
  if (linkedinUrl) body.linkedin_url = linkedinUrl;

  const res = await fetch(`${BASE}/search/contact`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Waterfall contact search error (${res.status}): ${text}`);
  }

  const data: ContactSearchResponse = await res.json();
  return data.persons ?? [];
}

// --- Title filter groups with multi-language variants ---

const SEARCH_GROUPS: { label: string; titles: string[] }[] = [
  {
    label: "Leadership",
    titles: [
      // English
      "ceo", "cto", "founder", "co-founder", "managing director",
      // Dutch
      "directeur", "oprichter", "mede-oprichter", "algemeen directeur",
      // Norwegian
      "daglig leder", "grunnlegger", "medgrunnlegger", "administrerende direktør",
      // Danish
      "direktør", "stifter", "medstifter", "administrerende direktør",
      // Swedish
      "vd", "grundare", "medgrundare", "verkställande direktör",
    ],
  },
  {
    label: "Operations",
    titles: [
      // English
      "coo", "operations director", "vp operations", "head of operations",
      // Dutch
      "operationeel directeur", "hoofd operaties",
      // Norwegian
      "driftsdirektør", "driftssjef", "leder for drift",
      // Danish
      "driftsdirektør", "driftschef",
      // Swedish
      "driftschef", "operativ chef", "driftsdirektör",
    ],
  },
  {
    label: "People & Culture",
    titles: [
      // English
      "hr", "human resources", "people", "culture", "wellbeing", "head of people", "hr director", "people director",
      // Dutch
      "hr-directeur", "hoofd hr", "hoofd personeel", "welzijn",
      // Norwegian
      "hr-sjef", "personalsjef", "hr-direktør", "leder for mennesker og kultur",
      // Danish
      "hr-chef", "personalechef", "hr-direktør", "trivsel",
      // Swedish
      "hr-chef", "personalchef", "hr-direktör", "välbefinnande",
    ],
  },
  {
    label: "L&D",
    titles: [
      // English
      "learning and development", "learning & development", "l&d", "training", "training manager", "head of learning",
      // Dutch
      "opleidingsmanager", "hoofd leren en ontwikkeling", "trainingsmanager",
      // Norwegian
      "opplæringssjef", "leder for læring og utvikling",
      // Danish
      "uddannelseschef", "leder for læring og udvikling",
      // Swedish
      "utbildningschef", "chef för lärande och utveckling",
    ],
  },
  {
    label: "Finance",
    titles: [
      // English
      "cfo", "finance director", "controller", "head of finance", "finance manager",
      // Dutch
      "financieel directeur", "hoofd financiën", "controller",
      // Norwegian
      "finansdirektør", "økonomisjef", "økonomidirektør",
      // Danish
      "finansdirektør", "økonomichef", "økonomidirektør",
      // Swedish
      "finanschef", "ekonomichef", "ekonomidirektör",
    ],
  },
];

// --- Public API ---

export async function enrichCompany(
  domain: string
): Promise<WaterfallCompany | null> {
  const jobId = await launchJob("/enrichment/company", { domain });
  const result = await pollJob<{ company: WaterfallCompany }>(
    "/enrichment/company",
    jobId
  );

  if (result.status !== "SUCCEEDED") return null;
  return result.output?.company ?? null;
}

export interface WaterfallSearchResult {
  company: WaterfallCompany | null;
  persons: WaterfallPerson[];
  searchGroups: {
    label: string;
    personCount: number;
    status: "ok" | "error";
    error?: string;
  }[];
}

export async function findEmployees(
  domain: string
): Promise<WaterfallSearchResult> {
  // Step 1: Enrich company first to get LinkedIn URL slug
  const companyResult = await enrichCompany(domain).catch(() => null);
  const companyLinkedinUrl = companyResult?.linkedin_url ?? undefined;

  // Step 2: Fire 5 parallel contact searches with domain + linkedin_url
  const contactResults = await Promise.allSettled(
    SEARCH_GROUPS.map(async (group) => {
      const persons = await searchContacts(domain, group.titles, companyLinkedinUrl);
      return { label: group.label, persons };
    })
  );

  // Dedupe persons by linkedin_url, keep only those with LinkedIn profiles
  const seen = new Set<string>();
  const allPersons: WaterfallPerson[] = [];
  const searchGroups: WaterfallSearchResult["searchGroups"] = [];

  for (let i = 0; i < contactResults.length; i++) {
    const r = contactResults[i];
    if (r.status === "fulfilled") {
      searchGroups.push({
        label: r.value.label,
        personCount: r.value.persons.length,
        status: "ok",
      });

      for (const person of r.value.persons) {
        if (!person.linkedin_url) continue;
        if (!seen.has(person.linkedin_url)) {
          seen.add(person.linkedin_url);
          allPersons.push(person);
        }
      }
    } else {
      searchGroups.push({
        label: SEARCH_GROUPS[i].label,
        personCount: 0,
        status: "error",
        error: r.reason?.message ?? "Search failed",
      });
    }
  }

  return {
    company: companyResult,
    persons: allPersons,
    searchGroups,
  };
}
