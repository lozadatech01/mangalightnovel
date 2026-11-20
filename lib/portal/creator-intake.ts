export const languages = { en: "English", fil: "Filipino", ja: "Japanese", ko: "Korean", zh: "Chinese", es: "Spanish", fr: "French", id: "Indonesian", th: "Thai", vi: "Vietnamese" };
export const formats = { pages: "Page images", text: "Text", epub: "EPUB" };
export const contributorRoles = { author: "Author", illustrator: "Illustrator", translator: "Translator", adapter: "Adapter" };
export const territories = { PH: "Philippines", WORLD: "Worldwide" };
export const maxPeople = 12;

export type Person = { first: string; last: string; role?: string };
export type Applicant = { applicant: true };
export type Scope = { channel: "web"; territory: string; from?: string; until?: string };
export type CreatorValue = (Person | Applicant)[] | Scope;
type PersonInput = { first: string; last: string; role: string };
export type RightsInput = { mode: string; contributors: PersonInput[]; claimants: PersonInput[]; territory: string; from: string; until: string };
export const blankPerson = { first: "", last: "", role: "" };
const blank: RightsInput = { mode: "", contributors: [], claimants: [], territory: "", from: "", until: "" };

export function decodeRights(raw: string): RightsInput | null {
  try {
    const x = JSON.parse(raw);
    if (!x || typeof x !== "object" || !Array.isArray(x.contributors) || !Array.isArray(x.claimants) ||
        x.contributors.length > maxPeople || x.claimants.length > maxPeople) return null;
    const str = (x: unknown) => typeof x === "string" ? x : "";
    const rows = (x: unknown) => Array.isArray(x) ? x.slice(0, maxPeople).map(row => ({
      first: str(row?.first), last: str(row?.last), role: str(row?.role),
    })) : [];
    return { mode: str(x.mode), contributors: rows(x.contributors), claimants: rows(x.claimants),
      territory: str(x.territory), from: str(x.from), until: str(x.until) };
  } catch {
    return null;
  }
}

export function readRights(fields: Record<string, string | number | CreatorValue>): RightsInput {
  const contributors = fields.contributors;
  const claimants = fields.claimants;
  const solo = Array.isArray(contributors) && contributors.length === 1 && "applicant" in contributors[0];
  const scope = typeof fields.requested_scope === "object" ? fields.requested_scope : {};
  return decodeRights(JSON.stringify({ ...scope, mode: solo ? "solo" : Array.isArray(contributors) || Array.isArray(claimants) ? "shared" : "",
    contributors: Array.isArray(contributors) ? contributors : [], claimants: Array.isArray(claimants) ? claimants : [] })) ?? blank;
}

const namePattern = /^[\p{L}\p{M}][\p{L}\p{M} .'’\p{Pd}]{0,79}$/u;
const cleanName = (s: string) => s.trim().replace(/\s+/g, " ").normalize("NFC");
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
export function parseRights(input: RightsInput, submit: boolean) {
  const values: Record<string, CreatorValue> = {};
  if (!["", "solo", "shared"].includes(input.mode)) return { error: "Choose who created and owns the title." };
  if (input.mode === "solo") {
    values.contributors = [{ applicant: true }];
    values.claimants = [{ applicant: true }];
  } else if (input.mode === "shared") {
    for (const key of ["contributors", "claimants"] as const) {
      const people: Person[] = [];
      const seen = new Set<string>();
      for (const row of input[key]) {
        const first = cleanName(row.first), last = cleanName(row.last);
        if (!first && !last && !row.role) continue;
        if (!namePattern.test(first) || (last && !namePattern.test(last))) return { error: "Enter a valid first or single name for each person. A last name is optional." };
        if (key === "contributors" && !Object.hasOwn(contributorRoles, row.role)) return { error: "Choose a role for each contributor." };
        const person = { first, last, ...(key === "contributors" ? { role: row.role } : {}) };
        const signature = JSON.stringify(person).toLocaleLowerCase();
        if (seen.has(signature)) return { error: "Remove the duplicate person or credit." };
        seen.add(signature);
        people.push(person);
      }
      if (people.length) values[key] = people;
    }
  }
  if (input.territory || input.from || input.until) {
    if (!Object.hasOwn(territories, input.territory)) return { error: "Choose a publication territory." };
    if ((input.from && !validDate(input.from)) || (input.until && !validDate(input.until)) ||
        (input.from && input.until && input.from >= input.until)) return { error: "Choose valid publication dates. The end must follow the start." };
    values.requested_scope = { channel: "web", territory: input.territory,
      ...(input.from ? { from: input.from } : {}), ...(input.until ? { until: input.until } : {}) };
  }
  if (submit && !values.contributors) return { error: "Choose sole creator or add at least one contributor." };
  if (submit && !values.claimants) return { error: "Add at least one rights holder." };
  if (submit && !values.requested_scope) return { error: "Choose a publication territory." };
  return { values };
}

export function describeCreatorValue(value: CreatorValue) {
  if (Array.isArray(value)) return value.map(person => "applicant" in person ? "Applicant (self-declared)" :
    [person.first, person.last, person.role ? "· " + contributorRoles[person.role as keyof typeof contributorRoles] : ""].filter(Boolean).join(" ")).join("\n");
  return ["Loxada website", territories[value.territory as keyof typeof territories], value.from && "From " + value.from,
    value.until && "Until " + value.until].filter(Boolean).join(" · ");
}
