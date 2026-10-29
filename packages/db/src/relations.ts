import { defineRelations } from "drizzle-orm";

import * as definitionsSchema from "./schema/definitions";
import * as responsesSchema from "./schema/responses";

export const definitionsRelationsCombined = {
  ...defineRelations(definitionsSchema),
  ...definitionsSchema.authRelations,
  ...definitionsSchema.definitionsRelations,
};

export const responsesRelationsCombined = {
  ...defineRelations(responsesSchema),
  ...responsesSchema.responsesRelations,
};

// Backward compatibility
export const relations = definitionsRelationsCombined;
