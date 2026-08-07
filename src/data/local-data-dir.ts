// Where the file-backed database lives when no server one is named, and the name of the variable
// that moves it. One rule, two readers, for the reason optional-text.ts gives beside the same shape:
// src/data/db.ts opens the directory and drizzle.config.ts migrates it, and a default carried twice
// is how a migration comes to be applied somewhere the application never opens.
//
// The name is constrained to this prefix because .gitignore is what stops a database being
// committed, and it holds by prefix rather than by knowing every name a caller may choose.
export const LOCAL_DATA_DIR = '.postgres'

export const LOCAL_DATA_DIR_VARIABLE = 'TANUKITSUNE_LOCAL_DATABASE'
