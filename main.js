import he from "he";
import ObjectsToCsv from "objects-to-csv";
import request from "./request.js";

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

const DEPILACAO = ["Depilação", "Depilação Masculina"];
const FACIAL = [
  "Depilação Facial com Linha",
  "Labial e Máscaras Faciais",
  "Design e coloração",
];

const report = {};

await getPartnersList();
for (const store in data) {
  await getPartnersInfo(store);
  console.log("Loja %s:", store);
  for (const index in data[store].nome) {
    console.log(data[store].nome[index] + ": ", data[store].resultados[index]);
  }
  console.log("\n\n");
}

for (const [partner, row] of Object.entries(report)) {
  let depilacaoTotal = 0;
  let facialTotal = 0;
  let manicureTotal = 0;
  let numLimpezaDePele = 0;
  row.map((entry) => {
    depilacaoTotal += entry.resultados.Depilação.valorTotal;
    facialTotal += entry.resultados.Facial.valorTotal;
    manicureTotal += entry.resultados.Manicure.valorTotal;
    numLimpezaDePele += entry.resultados["Limpeza de pele"].quantidadeVendida;
  });
  report[partner].push({
    loja: "Total",
    resultados: {
      Depilação: depilacaoTotal,
      Facial: facialTotal,
      "Limpeza de pele": numLimpezaDePele,
      Manicure: manicureTotal,
    },
  });
}

for (const [partner, row] of Object.entries(report)) {
  console.log(`${partner}: `);
  for (const entry of row) {
    console.log(`Loja: ${entry.loja}`);
    console.log(entry.resultados);
  }
}

await new ObjectsToCsv(report).toDisk("relatorio.csv");

async function getPartnersList() {
  for (const store in request.lojaIds) {
    console.log("Pegando lista de parceiras da loja ", store);

    const table = await request.partnersList(store);

    const namePattern = new RegExp("(?<=<b[^>]+>).+?(?=<)", "g");
    const parceiras = table.matchAll(namePattern);

    const idPattern = new RegExp('(?<= profissional=\").+?(?=\")', "g");
    const ids = table.matchAll(idPattern, "g");

    for (const parceira of parceiras) {
      data[store].nome.push(he.decode(parceira[0]));
    }

    for (const id of ids) {
      console.log("paceira id: ", id[0]);
      data[store].id.push(id[0]);
    }
  }
}

async function getPartnersInfo(store) {
  for (const [index, id] of data[store].id.entries()) {
    const registers = await request.partnerResults(store, id);
    let resultado = {};

    registers.map((r) => {
      resultado[r.NomeCategoria.trim()] = {
        valorTotal: r.ValorTotal,
        quantidadeVendida: r.QuantidadeVendida,
      };
    });
    const partnerName = data[store].nome[index];

    if (!(partnerName in report)) {
      report[partnerName] = [];
    }
    report[partnerName].push({
      resultados: getReportResult(registers),
      loja: store,
    });
    data[store].resultados.push(resultado);
  }
}

function getReportResult(registers) {
  let reportResult = {
    Depilação: {
      valorTotal: 0,
      quantidadeVendida: 0,
    },
    Facial: {
      valorTotal: 0,
      quantidadeVendida: 0,
    },
    "Limpeza de pele": {
      valorTotal: 0,
      quantidadeVendida: 0,
    },
    Manicure: {
      valorTotal: 0,
      quantidadeVendida: 0,
    },
  };

  registers.map((r) => {
    if (DEPILACAO.includes(r.NomeCategoria.trim())) {
      reportResult["Depilação"].valorTotal += r.ValorTotal;
      reportResult["Depilação"].quantidadeVendida += r.QuantidadeVendida;
    } else if (FACIAL.includes(r.NomeCategoria.trim())) {
      reportResult["Facial"].valorTotal += r.ValorTotal;
      reportResult["Facial"].quantidadeVendida += r.QuantidadeVendida;
    } else if (r.NomeCategoria.trim() === "Limpeza de pele") {
      reportResult["Limpeza de pele"].valorTotal += r.ValorTotal;
      reportResult["Limpeza de pele"].quantidadeVendida += r.QuantidadeVendida;
    } else if (r.NomeCategoria.trim() === "Manicure Nacional") {
      reportResult["Manicure"].valorTotal += r.ValorTotal;
      reportResult["Manicure"].quantidadeVendida += r.QuantidadeVendida;
    } else {
      reportResult[r.NomeCategoria.trim()] = {
        valorTotal: r.ValorTotal,
        quantidadeVendida: r.QuantidadeVendida,
      };
    }
  });
  return reportResult;
}
