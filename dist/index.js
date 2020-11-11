"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prompt = require("prompt-sync")();
const express = require('express');
const fs = require('fs');
const sql = require("mssql");
//Declare connection info variable
let connection = { hostname: "", username: "", password: "", database: "" };
//Prompt user for database connection info
function getConnectionInfo() {
    connection.hostname = prompt("Please enter the hostname address of your SQL Server: ");
    connection.username = prompt("Please enter your username: ");
    connection.password = prompt("Please enter your password: ", { echo: "*" });
    connection.database = prompt("Which database would you like to query?: ");
    console.log("Connecting to SQL Server...");
    //Connect to Server
    connect(connection);
}
//Connect to SQL Server
async function connect(connectionInfo) {
    try {
        const sqlConnectionPool = await sql.connect(`mssql://${connectionInfo.username}:${connectionInfo.password}@${connectionInfo.hostname}/${connectionInfo.database}`);
        if (sqlConnectionPool._connected) {
            await query(sqlConnectionPool);
        }
    }
    catch (e) {
        console.log(e.message);
        console.log("\n");
        getConnectionInfo();
    }
}
//Query database
async function query(sqlConnectionPool) {
    const table = prompt("Enter the name of the table or view you would like to generate a model for: ");
    const result = await sql.query(`SELECT c.TABLE_NAME,c.COLUMN_NAME,c.DATA_TYPE, c.IS_NULLABLE, CASE WHEN p.COLUMN_NAME = c.COLUMN_NAME THEN 'true' ELSE 'false' END  AS isPk FROM INFORMATION_SCHEMA.COLUMNS c LEFT JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE p ON p.COLUMN_NAME = c.COLUMN_NAME WHERE c.TABLE_NAME = '${table}'`);
    if (result.rowsAffected > 0) {
        let modelConfig = {
            "name": table.toUpperCase(),
            "base": "PersistedModel",
            "idInjection": true,
            "options": {
                "validateUpsert": true,
                "mssql": {
                    "schema": "dbo",
                    "table": table.toUpperCase()
                }
            },
            "properties": {},
            "validations": [],
            "relations": {},
            "acls": [],
            "methods": {}
        };
        //Build model config with returned data
        result.recordset.forEach((record) => {
            modelConfig.properties[record.COLUMN_NAME] = { "type": parseDataType(record.DATA_TYPE) };
            if (record.isPk === "true") {
                modelConfig.properties[record.COLUMN_NAME].id = true;
            }
            if (record.IS_NULLABLE === "NO") {
                modelConfig.properties[record.COLUMN_NAME].required = true;
            }
            else {
                modelConfig.properties[record.COLUMN_NAME].required = false;
            }
        });
        //Close the connection
        sqlConnectionPool.close();
        //If models directory does not exist, create it before writing model configuration.
        if (fs.existsSync("./models")) {
            writeFile(modelConfig, table);
        }
        else {
            fs.mkdir('./models', { recursive: true }, (err) => {
                if (err)
                    console.log(err);
                else
                    writeFile(modelConfig, table);
            });
        }
    }
    else {
        console.log(`Can't find a table or view with the name '${table}'. Please try again.`);
        return query(sqlConnectionPool);
    }
}
//Write model config to file
function writeFile(modelConfig, table) {
    fs.writeFile("./models/" + table.toLowerCase() + ".json", JSON.stringify(modelConfig), function (err) {
        if (err)
            console.log(err);
        else
            console.log('Successfully created model ' + table.toLowerCase() + ".json!");
    });
}
//Convert SQL Server datatypes to Loopback datatypes
function parseDataType(type) {
    if (type === "nvarchar" || type === "varchar" || type === "datetime") {
        return "string";
    }
    else if (type === "int" || type === "bigint" || type === "float") {
        return "number";
    }
    else {
        return "string";
    }
}
getConnectionInfo();
