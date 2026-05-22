import fs from "fs";
import { json2csv } from "json-2-csv";

function generateFile(goalReport) {
  const csv = getCsvFile(goalReport);
  const csvFile = json2csv(csv, {
    emptyFieldValue: 0,
    delimiter: { field: "\t" },
  });
  fs.writeFileSync("relatorio.csv", csvFile, "utf-8");
}

function getCsvFile(goalReport) {
  let csv = [];

  for (const [partner, row] of Object.entries(goalReport)) {
    let csvObject = {};
    csvObject["nome"] = partner;
    for (const entry of row) {
      for (const [category, value] of Object.entries(entry.resultados)) {
        csvObject[`${entry.loja}:${category}`] = value;
      }
    }
    csv.push(csvObject);
  }
  return csv;
}

const csv = { generateFile };

export default csv;
