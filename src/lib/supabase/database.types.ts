/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Permissive schema generic for the Supabase clients.
 *
 * Without a schema type, supabase-js resolves every table to `never` and no
 * query compiles. We deliberately do not check in a generated schema: the
 * shapes this app actually cares about live in `src/lib/types.ts` and are
 * applied at the call sites (`.select<T>()`, `as Boat[]`), which keeps the
 * schema file from going stale against the SQL. Regenerate a strict one with
 * `supabase gen types typescript` if you would rather have it enforced here.
 */
export type GenericTable = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: Record<string, GenericTable>;
    Views: Record<string, GenericTable>;
    Functions: Record<string, { Args: Record<string, any>; Returns: any }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, Record<string, any>>;
  };
};
