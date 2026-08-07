// Where the file-backed database lives when no server one is named. Here rather than in db.ts
// because that module is server-only and drizzle.config.ts cannot import it, which is the reason
// optional-text.ts gives for its own existence: a default carried twice is how a migration comes to
// be applied somewhere the application never opens.
//
// The name a caller may move it to is not constrained by anything here. What holds a database out of
// the repository is the .postgres prefix in .gitignore, so a caller keeps to it.
export const LOCAL_DATA_DIR = '.postgres'
