import request from "./request.js";

import he from "he";
import fs from "fs";
import { json2csv } from "json-2-csv";
import readline from "readline";
import { parse } from "csv-parse";

const allowedReason = [
  "cashback",
  "funcionários formosa",
  "aniversariante do mês",
  "campanha do mes",
  "campanha do mês",
];

const partnerData = {
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

const receptionistData = {
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

const forbiddenReasons = [];

await main();

async function main() {
  try {
    await getUserInput();
    await fetchReportData();
    calculateTotalReport(report);
    writeCsvFile();
  } catch (error) {
    console.error("Não foi possível calcular o relatório.");
    console.error(error.message);
    console.error(error);
  }
}

async function getUserInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const allowedInputs = ["", "m", "d"];

  console.log("Instruções:");
  console.log(
    "Aperte 'enter' para gerar o relatório do dia 1 até ontem deste mês",
  );
  console.log("Aperte 'm e enter' para gerar o relatório do mês passado");
  console.log(
    "Aperte 'd e enter' para selecionar uma data de ínicio e de fim\n",
  );
  const option = await question("Insira instrução:\n", rl);

  if (!allowedInputs.includes(option)) {
    rl.close();
    throw new Error("Instrução %s é inválida", option);
  }

  const today = new Date();
  const finalDateObj = new Date(today.getFullYear(), today.getMonth(), 0);
  const year = finalDateObj.getFullYear();
  const month = String(finalDateObj.getMonth() + 1).padStart(2, "0");
  const finalDay = String(finalDateObj.getDate()).padStart(2, "0");
  const startDay = "01";
  const newFinalDate = `${finalDay}/${month}/${year}`;
  const newStartDate = `${startDay}/${month}/${year}`;

  if (option === "") {
    rl.close();
    if (finalDay === startDay) {
      throw new Error(
        "Não é possível calcularo relatório do dia 01 até ontem pois hoje é dia 01.",
      );
    }
  }

  if (option === "m") {
    rl.close();
    request.setMonthAndYear(month, year);
    request.setStartDate(newStartDate);
    request.setFinalDate(newFinalDate);
  }

  if (option === "d") {
    console.log("Digite a data inicial com o seguinte formato 13/02/2026");
    const startDateInput = await question("Insira a data de ínicio:", rl);
    const finalDateInput = await question("Insira a data de término:", rl);
    rl.close();
    validateDates(startDateInput, finalDateInput);
    const split = startDateInput.split("/");
    request.setMonthAndYear(split[1], split[2]);
    request.setStartDate(startDateInput);
    request.setFinalDate(finalDateInput);
  }

  console.log(
    "\n\nCalculando relatório a partir de %s até %s",
    request.getStartDate(),
    request.getFinalDate(),
  );
}

function question(statement, rl) {
  return new Promise((resolve) => {
    rl.question(statement, (answer) => {
      resolve(answer);
    });
  });
}

function validateDates(start, final) {
  const datePattern =
    /^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/;
  if (!datePattern.test(start)) {
    throw new Error(`Data inicial ${start} não segue o padrão 01/03/2025.`);
  }

  if (!datePattern.test(final)) {
    throw new Error(`Data final ${final} não segue o padrão 01/03/2025.`);
  }

  const startDate = new Date(start);
  const finalDate = new Date(final);

  if (finalDate <= startDate) {
    throw new Error("A data final deve ser após a inicial.");
  }
}

async function fetchReportData() {
  await getPartnersList();
  for (const store in partnerData) {
    await getPartnersInfo(store);
    await getReceptionistInfo(store);
    await getClientsAmount(store);
  }
  console.log(
    "\nMotivos inválidos para contabilizar a quantidade de agendamentos:",
  );
  forbiddenReasons.map((reason) => console.log(reason));
}

function writeCsvFile() {
  const csv = getCsvFile(report);
  const csvFile = json2csv(csv, {
    emptyFieldValue: 0,
    delimiter: { field: "\t" },
  });
  fs.writeFileSync("relatorio.csv", csvFile, "utf-8");
}

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
  }
  return csv;
}

function calculateTotalReport(report) {
  for (const [partner, row] of Object.entries(report)) {
    let depilacaoTotal = 0;
    let facialTotal = 0;
    let manicureTotal = 0;
    let numLimpezaDePele = 0;
    let numProdutos = 0;
    let numCombos = 0;

    row.map((entry) => {
      depilacaoTotal += entry.resultados.depilação;
      facialTotal += entry.resultados.facial;
      manicureTotal += entry.resultados.manicure;
      numLimpezaDePele += entry.resultados["limpeza de pele"];
      numProdutos += entry.resultados.produtos;
      numCombos += entry.resultados.combos;
    });
    report[partner].unshift({
      loja: "total",
      resultados: {
        depilação: depilacaoTotal,
        facial: facialTotal,
        "limpeza de pele": numLimpezaDePele,
        manicure: manicureTotal,
        produtos: numProdutos,
        combos: numCombos,
      },
    });
  }
}

async function getPartnersList() {
  for (const store in request.lojaIds) {
    console.log("Buscando lista de parceiras da loja %s\n", store);
    const partnerTable = await request.employeesList(store);

    const namePattern = new RegExp("(?<=<b[^>]+>).+?(?=<)", "g");
    const partners = partnerTable.matchAll(namePattern);

    const idPattern = new RegExp('(?<= profissional=\").+?(?=\")', "g");
    const partnerIds = partnerTable.matchAll(idPattern, "g");

    for (const parceira of partners) {
      partnerData[store].nome.push(he.decode(parceira[0]));
    }

    for (const id of partnerIds) {
      partnerData[store].id.push(id[0]);
    }

    const receptionistTable = await request.employeesList(store, true);

    const receptionistNames = receptionistTable.matchAll(namePattern);

    const receptionistIds = receptionistTable.matchAll(idPattern, "g");

    for (const name of receptionistNames) {
      receptionistData[store].nome.push(he.decode(name[0]));
    }

    for (const id of receptionistIds) {
      receptionistData[store].id.push(id[0]);
    }
  }
}

async function getPartnersInfo(store) {
  console.log("Buscando informações específicas da %s\n", store);
  for (const [index, id] of partnerData[store].id.entries()) {
    const partnerName = partnerData[store].nome[index];
    console.log("Buscando serviços da %s", partnerName);

    const registers = await request.partnerResults(store, id);

    if (!(partnerName in report)) {
      report[partnerName] = [];
    }
    report[partnerName].push({
      resultados: getReportResult(registers),
      loja: store,
    });
  }
  console.log("");
}

async function getReceptionistInfo(store) {
  for (const [index, id] of receptionistData[store].id.entries()) {
    const receptionistName = receptionistData[store].nome[index];
    console.log("Buscando pacotes e produtos da %s", receptionistName);

    const registers = await getCombosAndProductsFromReceptionist(store, id);

    if (!(receptionistName in report)) {
      report[receptionistName] = [];
    }

    report[receptionistName].push({
      resultados: getReportResult(registers),
      loja: store,
    });
  }
  console.log("");
}

async function getCombosAndProductsFromReceptionist(store, id) {
  const html = await request.receptionistResults(store, id);

  const productExistencePattern = new RegExp(
    "<h4>Sobre Produtos Vendidos</h4>",
    "g",
  );
  const comboExistencePattern = new RegExp(
    "<h4>Sobre Pacotes Vendidos</h4>",
    "g",
  );

  const productExist = productExistencePattern.test(html);
  const comboExist = comboExistencePattern.test(html);

  const receptionistPattern = new RegExp(
    '(?<=<td class="valorGrande" style="text-align: center;">).+?(?=<)',
    "g",
  );
  const receptionistInfo = Array.from(html.matchAll(receptionistPattern));
  const products = productExist ? receptionistInfo.shift() : 0;
  const combos = comboExist ? receptionistInfo.shift() : 0;

  const registers = [
    {
      NomeCategoria: "produtos",
      QuantidadeVendida: products[0],
    },
    {
      NomeCategoria: "combos",
      QuantidadeVendida: combos[0],
    },
  ];

  return registers;
}

async function getClientsAmount(store) {
  console.log(`Buscando quantidade de clientes da loja ${store}`);
  const [clientsAmount, storeForbiddenReasons] =
    await request.clientsAmount(store);

  storeForbiddenReasons.map((reason) => {
    if (!forbiddenReasons.includes(reason)) forbiddenReasons.push(reason);
  });

  if (!(store in report)) {
    report[store] = [];
  }

  report[store].push({
    resultados: getReportResult([
      {
        NomeCategoria: "clientes",
        Quantidade: clientsAmount,
      },
    ]),
    loja: store,
  });
}

function getReportResult(registers) {
  let reportResult = {
    depilação: 0,
    facial: 0,
    "limpeza de pele": 0,
    manicure: 0,
    produtos: 0,
    combos: 0,
    clientes: 0,
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
    } else if (categoria === "produtos") {
      reportResult["produtos"] += r.QuantidadeVendida;
    } else if (categoria === "combos") {
      reportResult["combos"] += r.QuantidadeVendida;
    } else if (categoria === "clientes") {
      reportResult["clientes"] += r.Quantidade;
    } else {
      if (!(categoria in reportResult))
        reportResult[categoria] = r.QuantidadeVendida;
      else reportResult[categoria] += r.QuantidadeVendida;
    }
  });
  return reportResult;
}

// const jsonString = JSON.stringify(report, null, 2);
// fs.writeFileSync("data.json", jsonString, "utf-8");

// const content = fs.readFileSync("./data.json", "utf-8");
// const storedReport = JSON.parse(content);
