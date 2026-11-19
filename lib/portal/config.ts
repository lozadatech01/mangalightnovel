export const departmentId = "manga";
export const departmentName = "Manga & Light Novel";
export const customerType = "reader";
export const selfSignupTypes: readonly string[] = ["reader","creator"];
export const invitationTypes: readonly string[] = ["publisher"];
const supplierWorkPanels = new Map([
  ["creator", "My Works"],
  ["publisher", "Catalog"],
]);
export const supplierTypes: readonly string[] = [...supplierWorkPanels.keys()];
export const accountLabels: Record<string, string> = {
  "reader": "Reader",
  "creator": "Independent author",
  "publisher": "Publisher"
};
export function isSupplier(type: string) { return supplierWorkPanels.has(type); }
export function supplierWorkPanelName(type: string) { return supplierWorkPanels.get(type); }
