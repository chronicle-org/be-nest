import { EntityManager } from "typeorm";

/**
 * Atomic add/remove of an id in a jsonb array column plus its counter, done
 * in one UPDATE so concurrent requests can't overwrite each other's changes.
 * Table and column names come from code, never from request input.
 */
type ArrayColumn = {
  table: "post" | "user";
  column: string;
  countColumn: string;
};

/** Adds value to the array; returns false if it was already there or the row is missing. */
export async function addToJsonbArray(
  manager: EntityManager,
  { table, column, countColumn }: ArrayColumn,
  rowId: number,
  value: number,
): Promise<boolean> {
  const result: [unknown, number] = await manager.query(
    `UPDATE "${table}"
     SET "${column}" = COALESCE("${column}", '[]'::jsonb) || jsonb_build_array($2::int),
         "${countColumn}" = "${countColumn}" + 1
     WHERE id = $1 AND NOT (COALESCE("${column}", '[]'::jsonb) @> jsonb_build_array($2::int))`,
    [rowId, value],
  );
  return result[1] > 0;
}

/** Removes value from the array; returns false if it wasn't there or the row is missing. */
export async function removeFromJsonbArray(
  manager: EntityManager,
  { table, column, countColumn }: ArrayColumn,
  rowId: number,
  value: number,
): Promise<boolean> {
  const result: [unknown, number] = await manager.query(
    `UPDATE "${table}"
     SET "${column}" = (
           SELECT COALESCE(jsonb_agg(e), '[]'::jsonb)
           FROM jsonb_array_elements("${column}") e
           WHERE e <> to_jsonb($2::int)
         ),
         "${countColumn}" = GREATEST("${countColumn}" - 1, 0)
     WHERE id = $1 AND "${column}" @> jsonb_build_array($2::int)`,
    [rowId, value],
  );
  return result[1] > 0;
}
