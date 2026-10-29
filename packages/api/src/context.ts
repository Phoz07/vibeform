import type { Session } from "@vibeform/auth";
import type { Database } from "@vibeform/db";

export type Context = {
  session: Session | null;
  db: Database;
};
