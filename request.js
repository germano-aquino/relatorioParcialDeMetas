import headers from "./headers.js";

const urlParceiras =
  "https://www.trinks.com/Backoffice/Comissao/ExibirProfissionaisRelatorioComissoes";
const urlServicos =
  "https://www.trinks.com/BackOffice/RankingDeServicos/ObterRankingDeServicos";

const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, "0");
const finalDay = String(currentDate.getDate() - 1).padStart(2, "0");
const startDay = "01";
const startDate = `${startDay}/${month}/${year}`;
const finalDate = `${finalDay}/${month}/${year}`;

const lojaIds = {
  14: {
    idRelacaoProfissional: "46810",
    idEstabelecimento: "18769",
  },
  batista: {
    idRelacaoProfissional: "103890",
    idEstabelecimento: "35295",
  },
  duque: {
    idRelacaoProfissional: "440885",
    idEstabelecimento: "120037",
  },
  umarizal: {
    idRelacaoProfissional: "49102",
    idEstabelecimento: "19357",
  },
};

function getHeadersForStore(store) {
  const idEstabelecimentoPattern = new RegExp(
    "(?<=idEstabelecimentoPadrao)(.+?)=(.+?)(?=;)",
  );
  const cookie = headers.Cookie.replace(
    idEstabelecimentoPattern,
    `$1=${lojaIds[store].idEstabelecimento}`,
  );

  return {
    ...headers,
    "id-estabelecimento-autenticado": lojaIds[store].idEstabelecimento,
    Cookie: cookie,
  };
}

async function partnersList(store) {
  const requestBody = {
    TipoData: 2,
    DataInicio: startDate,
    DataFim: finalDate,
    TipoItemPago: 0,
    ExibirEstornos: false,
    TipoStatusFiltroPagamento: 1,
    IdRelacaoProfissional: lojaIds[store].idRelacaoProfissional,
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
  const responseBody = await response.json();

  return responseBody.Dados.Registros;
}

const request = {
  partnersList,
  partnerResults,
  lojaIds,
};

export default request;
