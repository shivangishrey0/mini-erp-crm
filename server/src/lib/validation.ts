export function formatZodError(error: { issues: { message: string }[] }): string {
  return error.issues.map((issue) => issue.message).join(", ");
}
