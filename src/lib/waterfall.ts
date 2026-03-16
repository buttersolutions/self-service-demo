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

// --- Title filter buckets (boolean filter expressions, matches contact-discovery agent) ---

const TITLE_FILTERS: { name: string; filter: string }[] = [
  {
    name: "leadership",
    filter:
      "((ceo) OR (cto) OR (chief executive) OR (owner) OR (founder) OR (co-founder) OR (managing director) OR (md) OR (algemeen directeur) OR (directeur generaal) OR (eigenaar) OR (administrerende direktør) OR (daglig leder) OR (adm. dir.) OR (verkställande direktör) OR (vd)) AND NOT ((assistant) OR (intern))",
  },
  {
    name: "operations",
    filter:
      "((coo) OR (chief operating) OR (operations director) OR (director of operations) OR (head of operations) OR (vp operations) OR (vp of operations) OR (operations manager) OR (operationeel directeur) OR (directeur operaties) OR (operationeel manager) OR (hoofd operations) OR (bedrijfsleider) OR (driftsjef) OR (driftsleder) OR (driftschef)) AND NOT ((assistant) OR (intern) OR (coordinator))",
  },
  {
    name: "people_culture",
    filter:
      "((hr) OR (human resources) OR (chro) OR (cpo) OR (people) OR (culture) OR (head of people) OR (people director) OR (director of people) OR (people manager) OR (chief people) OR (hr director) OR (hr manager) OR (head of hr) OR (people and culture) OR (people & culture) OR (culture director) OR (people ops) OR (people operations) OR (employer brand) OR (wellbeing) OR (internal communications) OR (internal comms) OR (employee communications) OR (employee engagement) OR (communications director) OR (communications manager) OR (personeelsmanager) OR (personeelsdirecteur) OR (hoofd p&o) OR (p&o manager) OR (p&o directeur) OR (hr-manager) OR (hr-sjef) OR (personalsjef) OR (hr-leder) OR (hr-chef) OR (personalechef) OR (personalchef) OR (hr-ansvarig)) AND NOT ((assistant) OR (intern) OR (coordinator) OR (administrator) OR (external) OR (marketing))",
  },
  {
    name: "l_and_d",
    filter:
      "((learning) OR (learning and development) OR (learning & development) OR (l&d) OR (head of l&d) OR (l&d manager) OR (l&d director) OR (training manager) OR (training director) OR (head of training) OR (people development) OR (opleidingsmanager) OR (opleidingsdirecteur) OR (hoofd opleiding) OR (opplæringssjef) OR (opplæringsleder) OR (uddannelseschef) OR (utbildningschef) OR (utbildningsansvarig)) AND NOT ((assistant) OR (intern))",
  },
  {
    name: "finance",
    filter:
      "((cfo) OR (chief financial) OR (finance director) OR (director of finance) OR (financial controller) OR (vp finance) OR (head of finance) OR (financieel directeur) OR (hoofd financiën) OR (financieel controller) OR (økonomisjef) OR (finansdirektør) OR (ekonomichef) OR (finansdirektör)) AND NOT ((assistant) OR (intern))",
  },
];

const BUCKET_LABELS: Record<string, string> = {
  leadership: "Leadership",
  operations: "Operations",
  people_culture: "People & Culture",
  l_and_d: "L&D",
  finance: "Finance",
};

// --- Contact search (synchronous, paginated) ---

interface ContactSearchResult {
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED_OUT" | "ABORTED";
  output?: { persons: WaterfallPerson[] };
}

async function searchContacts(
  domain: string,
  pageNumber = 1,
  pageSize = 25
): Promise<{ persons: WaterfallPerson[]; hasMore: boolean }> {
  const res = await fetch(`${BASE}/search/contact`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      domain,
      title_filters: TITLE_FILTERS,
      page_size: pageSize,
      page_number: pageNumber,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Waterfall contact search error (${res.status}): ${text}`);
  }

  const data: ContactSearchResult = await res.json();
  if (data.status !== "SUCCEEDED") return { persons: [], hasMore: false };

  const persons = data.output?.persons ?? [];
  return { persons, hasMore: persons.length >= pageSize };
}

async function searchAllContacts(domain: string): Promise<WaterfallPerson[]> {
  const allPersons: WaterfallPerson[] = [];
  let page = 1;
  const maxPages = 4;

  while (page <= maxPages) {
    const { persons, hasMore } = await searchContacts(domain, page);
    allPersons.push(...persons);
    if (!hasMore) break;
    page++;
  }

  return allPersons;
}

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
  // Run company enrichment + paginated contact search in parallel
  const [companyResult, contactResult] = await Promise.allSettled([
    enrichCompany(domain),
    searchAllContacts(domain),
  ]);

  const company =
    companyResult.status === "fulfilled" ? companyResult.value : null;

  const allContacts =
    contactResult.status === "fulfilled" ? contactResult.value : [];
  const searchError =
    contactResult.status === "rejected"
      ? contactResult.reason?.message ?? "Search failed"
      : undefined;

  // Dedupe by LinkedIn URL, count per bucket using seniority/department from Waterfall
  const seen = new Set<string>();
  const persons: WaterfallPerson[] = [];
  const bucketCounts = new Map<string, number>();
  for (const f of TITLE_FILTERS) bucketCounts.set(f.name, 0);

  for (const person of allContacts) {
    if (!person.linkedin_url) continue;
    if (seen.has(person.linkedin_url)) continue;
    seen.add(person.linkedin_url);
    persons.push(person);

    // Map Waterfall's department field back to our bucket labels
    const dept = (person.department ?? "").toLowerCase();
    for (const f of TITLE_FILTERS) {
      const label = BUCKET_LABELS[f.name]?.toLowerCase();
      if (label && dept.includes(label.split(" ")[0])) {
        bucketCounts.set(f.name, (bucketCounts.get(f.name) ?? 0) + 1);
        break;
      }
    }
  }

  const searchGroups = TITLE_FILTERS.map((f) => ({
    label: BUCKET_LABELS[f.name] ?? f.name,
    personCount: bucketCounts.get(f.name) ?? 0,
    status: (searchError ? "error" : "ok") as "ok" | "error",
    error: searchError,
  }));

  return { company, persons, searchGroups };
}
