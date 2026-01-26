import headers from "./headers.js";
import he from "he";

const urlParceiras =
  "https://www.trinks.com/Backoffice/Comissao/ExibirProfissionaisRelatorioComissoes";
const urlServicos =
  "https://www.trinks.com/BackOffice/RankingDeServicos/ObterRankingDeServicos";

const [startDate, finalDate, finalDateUs] = createDateInterval();

const data = {
  14: {
    nome: [],
    id: [],
    resultados: [],
  },
};

await getPartnersList();
await getPartnersInfo(data["14"].id);
console.log(data["14"].nome);
console.log(data["14"].resultados);

function createDateInterval() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const finalDay = String(currentDate.getDate() - 1).padStart(2, "0");
  const startDay = "01";
  const startDate = `${startDay}/${month}/${year}`;
  const finalDate = `${finalDay}/${month}/${year}`;
  const finalDateUs = `${month}/${finalDay}/${year}`;

  return [startDate, finalDate, finalDateUs];
}

async function getPartnersList() {
  console.log("Pegando lista de parceiras");

  const requestBody = {
    TipoData: 1,
    DataInicio: startDate,
    DataFim: finalDate,
    TipoItemPago: 0,
    ExibirEstornos: false,
    TipoStatusFiltroPagamento: 1,
    IdRelacaoProfissional: 46810,
    mes: 1,
    ano: 2026,
    profissional: undefined,
    indexLinha: 0,
  };

  const encodedBody = new URLSearchParams(requestBody);

  const parceirasResponse = await fetch(urlParceiras, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
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
    data["14"].nome.push(he.decode(parceira[0]));
  }

  console.log("Ids:\n");
  for (const id of ids) {
    data["14"].id.push(id[0]);
  }
}

async function getPartnersInfo(ids) {
  for (const id of ids) {
    const registers = await makeRequisitionForPartner(id);
    let resultado = {};

    registers.map((r) => {
      resultado[r.NomeCategoria] = {
        valorTotal: r.ValorTotal,
        quantidadeVendida: r.QuantidadeVendida,
      };
    });
    data["14"].resultados.push(resultado);
  }
}

async function makeRequisitionForPartner(id) {
  console.log("Pegando informação do usuário ", id);
  const body = JSON.stringify({
    Filtro: {
      DataFim: finalDate, //using us date
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
  const response = await fetch(urlServicos, {
    method: "POST",
    headers,
    body,
  });
  const responseBody = await response.json();
  return responseBody.Dados.Registros;
}
