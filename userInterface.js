import request from "./request.js";

import readline from "readline";

async function getInput() {
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

const userInterface = {
  getInput,
};

export default userInterface;
