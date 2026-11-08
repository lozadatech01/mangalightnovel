export const departmentId = "manga";
export const departmentName = "Manga & Light Novel";
export const customerType = "reader";
export const selfSignupTypes: readonly string[] = ["reader","creator"];
export const invitationTypes: readonly string[] = ["publisher"];
export const supplierTypes: readonly string[] = ["creator","publisher"];
export const accountLabels: Record<string, string> = {
  "reader": "Reader",
  "creator": "Independent author",
  "publisher": "Publisher"
};
export function isSupplier(type: string) { return supplierTypes.includes(type); }
