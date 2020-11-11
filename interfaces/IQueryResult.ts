import { IDatabaseRecord } from "./IDatabaseRecord";

export interface IQueryResult{
recordsets: Array<object>,
recordset: Array<IDatabaseRecord>,
output: object,
rowsAffected: number
}