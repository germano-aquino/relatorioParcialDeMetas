import userInterface from "./userInterface.js";
import report from "./report.js";
import csv from "./csv.js";

await main();

async function main() {
  try {
    await userInterface.getInput();
    const goalReport = await report.generate();
    csv.generateFile(goalReport);
  } catch (error) {
    console.error("Não foi possível calcular o relatório.");
    console.error(error.message);
    console.error(error);
  }
}

// const jsonString = JSON.stringify(report, null, 2);
// fs.writeFileSync("data.json", jsonString, "utf-8");

// const content = fs.readFileSync("./data.json", "utf-8");
// const storedReport = JSON.parse(content);
