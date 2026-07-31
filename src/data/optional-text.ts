// One rule, three readers: the application's environment, the migration tool's
// configuration and the end-to-end expectation. It lived in the first alone, and the
// two others each carried their own reading, which is how a fresh clone came to be
// told it had a server while the application opened a file.
//
// Held here rather than beside the parser, because that module is server-only and
// parses the whole environment, and a configuration file at the root can import
// neither.
export function asOptional(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value
}
