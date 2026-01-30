import request from "./request.js";

import he from "he";
import fs from "fs";
import { json2csv } from "json-2-csv";

const data = {
  14: {
    nome: [],
    id: [],
    resultados: [],
  },
  batista: {
    nome: [],
    id: [],
    resultados: [],
  },
  duque: {
    nome: [],
    id: [],
    resultados: [],
  },
  umarizal: {
    nome: [],
    id: [],
    resultados: [],
  },
};

const DEPILACAO = ["depilação", "depilação masculina"];
const FACIAL = [
  "depilação facial com linha",
  "labial e máscaras faciais",
  "design e coloração",
  "design + coloração",
];

const report = {};

await getPartnersList();
for (const store in data) {
  await getPartnersInfo(store);
}

// const jsonString = JSON.stringify(report, null, 2);
// fs.writeFileSync("data.json", jsonString, "utf-8");

// const content = fs.readFileSync("./data.json", "utf-8");
// const storedReport = JSON.parse(content);

calculateTotalReport(report);

const csv = getCsvFile(report);
const csvFile = json2csv(csv, { emptyFieldValue: 0 });
fs.writeFileSync("relatorio.csv", csvFile, "utf-8");

function getCsvFile(report) {
  let csv = [];

  for (const [partner, row] of Object.entries(report)) {
    let csvObject = {};
    csvObject["nome"] = partner;
    for (const entry of row) {
      for (const [category, value] of Object.entries(entry.resultados)) {
        csvObject[`${entry.loja}:${category}`] = value;
      }
    }
    csv.push(csvObject);
    console.log(csvObject);
  }
  return csv;
}

function calculateTotalReport(report) {
  for (const [partner, row] of Object.entries(report)) {
    let depilacaoTotal = 0;
    let facialTotal = 0;
    let manicureTotal = 0;
    let numLimpezaDePele = 0;
    row.map((entry) => {
      depilacaoTotal += entry.resultados.depilação;
      facialTotal += entry.resultados.facial;
      manicureTotal += entry.resultados.manicure;
      numLimpezaDePele += entry.resultados["limpeza de pele"];
    });
    report[partner].unshift({
      loja: "total",
      resultados: {
        depilação: depilacaoTotal,
        facial: facialTotal,
        "limpeza de pele": numLimpezaDePele,
        manicure: manicureTotal,
      },
    });
  }
}

async function getPartnersList() {
  for (const store in request.lojaIds) {
    const table = await request.partnersList(store);

    const namePattern = new RegExp("(?<=<b[^>]+>).+?(?=<)", "g");
    const parceiras = table.matchAll(namePattern);

    const idPattern = new RegExp('(?<= profissional=\").+?(?=\")', "g");
    const ids = table.matchAll(idPattern, "g");

    for (const parceira of parceiras) {
      data[store].nome.push(he.decode(parceira[0]));
    }

    for (const id of ids) {
      data[store].id.push(id[0]);
    }
  }
}

async function getPartnersInfo(store) {
  for (const [index, id] of data[store].id.entries()) {
    const registers = await request.partnerResults(store, id);
    const partnerName = data[store].nome[index];

    if (!(partnerName in report)) {
      report[partnerName] = [];
    }
    report[partnerName].push({
      resultados: getReportResult(registers),
      loja: store,
    });
  }
}

function getReportResult(registers) {
  let reportResult = {
    depilação: 0,
    facial: 0,
    "limpeza de pele": 0,
    manicure: 0,
  };

  registers.map((r) => {
    const categoria = r.NomeCategoria.toLowerCase().trim();
    if (DEPILACAO.includes(categoria)) {
      reportResult["depilação"] += r.ValorTotal;
    } else if (FACIAL.includes(categoria)) {
      reportResult["facial"] += r.ValorTotal;
    } else if (categoria === "limpeza de pele") {
      reportResult["limpeza de pele"] += r.QuantidadeVendida;
    } else if (categoria === "manicure nacional") {
      reportResult["manicure"] += r.ValorTotal;
    } else {
      if (!(categoria in reportResult))
        reportResult[categoria] = r.QuantidadeVendida;
      else reportResult[categoria] += r.QuantidadeVendida;
    }
  });
  return reportResult;
}
