export interface IModelConfig{
    "name": string,
    "base": string,
    "idInjection": boolean,
    "options": {
        "validateUpsert": boolean,
        "mssql": {
            "schema": string,
            "table": string
        }
    },
    "properties" : any,
    "validations": Array<any>,
    "relations": object,
    "acls": Array<any>,
    "methods": object
}