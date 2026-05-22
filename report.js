import request from "./request.js";

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

const forbiddenReasons = [];

async function generate() {
  const goalReport = {};

  await fetchReportData(goalReport);
  calculateTotalReport(goalReport);

  console.log(
    "Motivos inválidos para contabilizar a quantidade de agendamentos:\n",
  );
  forbiddenReasons.map((reason) => console.log(reason));

  return goalReport;
}

async function fetchReportData(goalReport) {
  await getEmployeesList();
  for (const store in partnerData) {
    console.log("Buscando informações específicas da %s\n", store);
    await getPartnersInfo(store, goalReport);
    await getReceptionistInfo(store, goalReport);
    await getClientsAmount(store, goalReport);
  }
}

async function getEmployeesList() {
  for (const store in request.lojaIds) {
    console.log("Buscando lista de parceiras da loja %s\n", store);
    const [partnerNames, partnerIds] = await request.employeesList(store);

    partnerData[store].nome.push(...partnerNames);
    partnerData[store].id.push(...partnerIds);

    const [receptionistNames, recepionistIds] = await request.employeesList(
      store,
      true,
    );

    receptionistData[store].nome.push(...receptionistNames);
    receptionistData[store].id.push(...recepionistIds);
  }
}

async function getPartnersInfo(store, goalReport) {
  await getEmployeesInfo(store, goalReport);
}

async function getReceptionistInfo(store, goalReport) {
  await getEmployeesInfo(store, goalReport, true);
}

async function getEmployeesInfo(store, goalReport, isReceptionist = false) {
  const data = isReceptionist ? receptionistData[store] : partnerData[store];
  const userOutput = isReceptionist
    ? "Buscando pacotes e produtos da %s"
    : "Buscando serviços da %s";
  const getEmployeeResults = isReceptionist
    ? request.receptionistResults
    : request.partnerResults;

  for (const [index, id] of data.id.entries()) {
    const employeeName = data.nome[index];

    console.log(userOutput, employeeName);

    const registers = await getEmployeeResults(store, id);

    insertRegistersInReport(employeeName, store, registers, goalReport);
  }
  console.log("");
}

async function getClientsAmount(store, goalReport) {
  console.log(`Buscando quantidade de clientes da loja ${store}\n`);
  const [clientsAmountRegisters, storeForbiddenReasons] =
    await request.clientsAmount(store);

  storeForbiddenReasons.map((reason) => {
    if (!forbiddenReasons.includes(reason)) forbiddenReasons.push(reason);
  });

  insertRegistersInReport(store, store, clientsAmountRegisters, goalReport);
}

function insertRegistersInReport(name, store, registers, goalReport) {
  if (!(name in goalReport)) {
    goalReport[name] = [];
  }

  goalReport[name].push({
    resultados: getReportResult(registers),
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

function calculateTotalReport(goalReport) {
  for (const [partner, row] of Object.entries(goalReport)) {
    let depilacaoTotal = 0;
    let facialTotal = 0;
    let manicureTotal = 0;
    let numLimpezaDePele = 0;
    let numProdutos = 0;
    let numCombos = 0;
    let numClientes = 0;

    row.map((entry) => {
      depilacaoTotal += entry.resultados.depilação;
      facialTotal += entry.resultados.facial;
      manicureTotal += entry.resultados.manicure;
      numLimpezaDePele += entry.resultados["limpeza de pele"];
      numProdutos += entry.resultados.produtos;
      numCombos += entry.resultados.combos;
      numClientes += entry.resultados.clientes;
    });

    goalReport[partner].unshift({
      loja: "total",
      resultados: {
        depilação: depilacaoTotal,
        facial: facialTotal,
        "limpeza de pele": numLimpezaDePele,
        manicure: manicureTotal,
        produtos: numProdutos,
        combos: numCombos,
        clientes: numClientes,
      },
    });
  }
}

const report = {
  generate,
};

export default report;
