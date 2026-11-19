// Ponto de entrada de `npm run validate:content`. O validador (validate-content.ts) importa o conteúdo
// com `import.meta.glob`, que só existe no Vite; o `runnerImport` carrega o módulo pelo runner do Vite.
import { runnerImport } from "vite";

const { module } = await runnerImport("/scripts/validate-content.ts", {
  configFile: false,
  logLevel: "error",
});

process.exitCode = await module.validateContent();
