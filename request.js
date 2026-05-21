import headers from "./headers.js";

import https from "https";
import { parse } from "csv-parse/sync";
import fs from "fs";

const urlParceiras =
  "https://www.trinks.com/Backoffice/Comissao/ExibirProfissionaisRelatorioComissoes";
const urlServicos =
  "https://www.trinks.com/BackOffice/RankingDeServicos/ObterRankingDeServicos";
const urlAtendimentos =
  "https://www.trinks.com/BackOffice/Download/ExportarFinanceiro";
const urlRecepcionista =
  "https://www.trinks.com/BackOffice/Comissao/ImprimirRelatorioProfissional";

const currentDate = new Date();
let year = currentDate.getFullYear();
let month = String(currentDate.getMonth() + 1).padStart(2, "0");
const finalDay = String(currentDate.getDate() - 1).padStart(2, "0");
const startDay = "01";
let startDate = `${startDay}/${month}/${year}`;
let finalDate = `${finalDay}/${month}/${year}`;

const content = fs.readFileSync("./motivosValidosDeAtendimentos.txt", "utf-8");
const allowedReason = content.split("\n");

const lojaIds = {
  14: {
    idRelacaoProfissional: "46810",
    idEstabelecimento: "18769",
    idRelacaoProfissionalRecepcionista: "46809",
  },
  batista: {
    idRelacaoProfissional: "103890",
    idEstabelecimento: "35295",
    idRelacaoProfissionalRecepcionista: "103889",
  },
  duque: {
    idRelacaoProfissional: "440885",
    idEstabelecimento: "120037",
    idRelacaoProfissionalRecepcionista: "440884",
  },
  umarizal: {
    idRelacaoProfissional: "49102",
    idEstabelecimento: "19357",
    idRelacaoProfissionalRecepcionista: "49101",
  },
};

let cookie = headers.Cookie;

function getHeadersForStore(store) {
  const idEstabelecimentoPattern = new RegExp(
    "(?<=idEstabelecimentoPadrao)(.+?)=(.+?)(?=;)",
  );
  cookie = cookie.replace(
    idEstabelecimentoPattern,
    `$1=${lojaIds[store].idEstabelecimento}`,
  );

  return {
    ...headers,
    "id-estabelecimento-autenticado": lojaIds[store].idEstabelecimento,
    Cookie: cookie,
  };
}

async function employeesList(store, isReceptionist = false) {
  const idRelacaoProfissional = isReceptionist
    ? lojaIds[store].idRelacaoProfissionalRecepcionista
    : lojaIds[store].idRelacaoProfissional;

  const requestBody = {
    TipoData: 2,
    DataInicio: startDate,
    DataFim: finalDate,
    TipoItemPago: 0,
    ExibirEstornos: false,
    TipoStatusFiltroPagamento: 1,
    IdRelacaoProfissional: idRelacaoProfissional,
    mes: Number(month),
    ano: year,
    profissional: undefined,
    indexLinha: 0,
  };

  const headers = getHeadersForStore(store);

  const encodedBody = new URLSearchParams(requestBody);

  const parceirasResponse = await fetch(urlParceiras, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodedBody,
  });

  cookieShouldBeSet(parceirasResponse);

  const parceirasBody = await parceirasResponse.json();

  const table = await parceirasBody.Html;
  return table;
}

async function partnerResults(store, id) {
  const body = JSON.stringify({
    Filtro: {
      DataFim: finalDate,
      DataInicio: startDate,
      VisualizarPor: 2,
      IdsServicos: [],
      IdsProfissional: [id],
      IdsCategoriaServico: [],
      ConsiderarConsumoPacote: true,
    },
    Paginacao: {
      pagina: 1,
      registroInicial: 1,
      registrosPorPagina: 15,
      totalPaginas: 1,
      totalItens: 1,
      quantidadeRegistrosAparecendo: 1,
    },
  });

  const headers = getHeadersForStore(store);

  const response = await fetch(urlServicos, {
    method: "POST",
    headers,
    body,
  });

  cookieShouldBeSet(response);

  const responseBody = await response.json();

  return responseBody.Dados.Registros;
}

async function receptionistResults(store, id) {
  const body = {
    TipoData: 2,
    DataInicio: startDate,
    DataFim: finalDate,
    TipoItemPago: 0,
    ExibirEstornos: false,
    TipoStatusFiltroPagamento: 1,
    IdRelacaoProfissional: lojaIds[store].idRelacaoProfissionalRecepcionista,
    CodigoProfissional: id,
    mes: month,
    ano: year,
    TipoDeImpressao: 0,
  };

  const headers = getHeadersForStore(store);

  const encodedBody = new URLSearchParams(body);

  const receptioninstResponse = await fetch(urlRecepcionista, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodedBody,
  });

  cookieShouldBeSet(receptioninstResponse);

  const responseBody = await receptioninstResponse.text();
  return responseBody;
}

async function clientsAmount(store) {
  const body = {
    TipoData: 2,
    DataInicio: startDate,
    DataFim: finalDate,
    ExibirEstornos: false,
    TipoFiltroTransacaoProduto: 0,
    IdFiltroPorDesconto: 0,
  };

  const headers = getHeadersForStore(store);

  const encodedBody = new URLSearchParams(body);

  const clientsAmountResponse = await fetch(urlAtendimentos, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodedBody,
  });

  cookieShouldBeSet(clientsAmountResponse);

  const responseBody = await clientsAmountResponse.json();

  const fileUrl = responseBody.Dados.UrlDownload;

  const forbiddenReasons = [];
  let appointmentAmount = 0;

  const response = await fetch(fileUrl);
  const rawData = await response.arrayBuffer();

  const decoder = new TextDecoder("windows-1252");
  const csvFile = decoder.decode(rawData);

  const csvParsed = parse(csvFile, {
    delimiter: ";",
    columns: true,
    from_line: 7,
    relax_column_count: true,
  });

  for (const row of csvParsed) {
    const reason = row["Motivo Desconto"]?.toLowerCase();

    if (row["Data de Atendimento/Venda"] === "") {
      break;
    }

    if (reason === "" || allowedReason.some((item) => item.includes(reason))) {
      appointmentAmount++;
    } else if (!forbiddenReasons.includes(reason)) {
      forbiddenReasons.push(reason);
    }
  }

  return [appointmentAmount, forbiddenReasons];
}

function cookieShouldBeSet(response) {
  const setCookie = response.headers.getSetCookie();
  if (setCookie) {
    setCookie.map((ck) => {
      const keyValue = ck.split(";")[0];
      const [key, value] = keyValue.split("=");
      const pattern = new RegExp(`(?<=${key})=(.+?)(?=;)`);
      cookie = cookie.replace(pattern, `=${value}`);
    });
  }
}

function setStartDate(newStartDate) {
  startDate = newStartDate;
}

function setFinalDate(newFinalDate) {
  finalDate = newFinalDate;
}

function getStartDate() {
  return startDate;
}

function getFinalDate() {
  return finalDate;
}

function setMonthAndYear(newMonth, newYear) {
  month = newMonth;
  year = newYear;
}

const request = {
  employeesList,
  partnerResults,
  receptionistResults,
  lojaIds,
  clientsAmount,
  setMonthAndYear,
  setStartDate,
  setFinalDate,
  getStartDate,
  getFinalDate,
};

export default request;
