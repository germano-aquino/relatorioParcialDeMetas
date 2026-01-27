import headers from "./headers.js";
import he from "he";
import setCookieParser from "set-cookie-parser";

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

await getPartnersList();
for (const store in data) {
  await getPartnersInfo(store);
  for (const index in data[store].nome) {
    console.log(data[store].nome[index] + ": ", data[store].resultados[index]);
  }
  console.log("\n\n");
}

async function getPartnersList() {
  for (const store in lojaIds) {
    console.log("Pegando lista de parceiras da loja ", store);

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

    const idEstabelecimentoPattern = new RegExp(
      "(?<=idEstabelecimentoPadrao)(.+?)=(.+?)(?=;)",
    );
    const newCookie = headers.Cookie.replace(
      idEstabelecimentoPattern,
      `$1=${lojaIds[store].idEstabelecimento}`,
    );

    const encodedBody = new URLSearchParams(requestBody);

    const parceirasResponse = await fetch(urlParceiras, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        "id-estabelecimento-autenticado": lojaIds[store].idEstabelecimento,
        Cookie: newCookie,
      },
      body: encodedBody,
    });

    console.log("Fim da requisição!");
    const parceirasBody = await parceirasResponse.json();

    const table = await parceirasBody.Html;

    const namePattern = new RegExp("(?<=<b[^>]+>).+?(?=<)", "g");
    const parceiras = table.matchAll(namePattern);

    const idPattern = new RegExp('(?<= profissional=\").+?(?=\")', "g");
    const ids = table.matchAll(idPattern, "g");

    console.log("\nNome das parceiras:\n");
    for (const parceira of parceiras) {
      data[store].nome.push(he.decode(parceira[0]));
    }

    console.log("\nIds:\n");
    for (const id of ids) {
      data[store].id.push(id[0]);
    }
  }
}

async function getPartnersInfo(store) {
  for (const id of data[store].id) {
    const registers = await makeRequisitionForPartner(store, id);
    let resultado = {};

    registers.map((r) => {
      resultado[r.NomeCategoria] = {
        valorTotal: r.ValorTotal,
        quantidadeVendida: r.QuantidadeVendida,
      };
    });
    data[store].resultados.push(resultado);
  }
}

async function makeRequisitionForPartner(store, id) {
  console.log("Pegando informação do usuário ", id);

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

  const idEstabelecimentoPattern = new RegExp(
    "(?<=idEstabelecimentoPadrao)(.+?)=(.+?)(?=;)",
  );
  const newCookie = headers.Cookie.replace(
    idEstabelecimentoPattern,
    `$1=${lojaIds[store].idEstabelecimento}`,
  );

  const response = await fetch(urlServicos, {
    method: "POST",
    headers: {
      ...headers,
      "id-estabelecimento-autenticado": lojaIds[store].idEstabelecimento,
      Cookie: newCookie,
    },
    body,
  });
  const responseBody = await response.json();
  return responseBody.Dados.Registros;
}
