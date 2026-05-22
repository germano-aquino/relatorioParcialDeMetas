import he from "he";

function namesAndIds(table) {
  const namePattern = new RegExp("(?<=<b[^>]+>).+?(?=<)", "g");
  const regexNames = table.matchAll(namePattern);

  const idPattern = new RegExp('(?<= profissional=\").+?(?=\")', "g");
  const regexIds = table.matchAll(idPattern, "g");

  const names = [];
  for (const name of regexNames) {
    names.push(he.decode(name[0].trim()));
  }

  const ids = [];
  for (const id of regexIds) {
    ids.push(id[0]);
  }

  return [names, ids];
}

function productsAndCombosRegisters(table) {
  const productExistencePattern = new RegExp(
    "<h4>Sobre Produtos Vendidos</h4>",
    "g",
  );
  const comboExistencePattern = new RegExp(
    "<h4>Sobre Pacotes Vendidos</h4>",
    "g",
  );

  const productExist = productExistencePattern.test(table);
  const comboExist = comboExistencePattern.test(table);

  const receptionistPattern = new RegExp(
    '(?<=<td class="valorGrande" style="text-align: center;">).+?(?=<)',
    "g",
  );
  const receptionistInfo = Array.from(table.matchAll(receptionistPattern));
  const products = productExist ? receptionistInfo.shift() : ["0"];
  const combos = comboExist ? receptionistInfo.shift() : ["0"];

  const registers = [
    {
      NomeCategoria: "produtos",
      QuantidadeVendida: stringToNumber(products[0]),
    },
    {
      NomeCategoria: "combos",
      QuantidadeVendida: stringToNumber(combos[0]),
    },
  ];

  return registers;
}

function stringToNumber(str) {
  return parseFloat(
    str.replace(/\s/g, "").replace(/\./g, "").replace(",", "."),
  );
}

const extracter = { namesAndIds, productsAndCombosRegisters };

export default extracter;
