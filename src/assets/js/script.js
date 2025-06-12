const codeArea = document.getElementById("codeArea");
const lineNumbers = document.getElementById("lineNumbers");

function updateLineNumbers() {
  const lines = codeArea.value.split("\n").length;
  let lineStr = "";
  for (let i = 1; i <= lines; i++) {
    lineStr += i + "\n";
  }
  lineNumbers.textContent = lineStr;
}

codeArea.addEventListener("input", updateLineNumbers);
codeArea.addEventListener("scroll", () => {
  lineNumbers.scrollTop = codeArea.scrollTop;
});

function evalWithContext(expression, context) {
  return Function(...Object.keys(context), `return ${expression}`)(...Object.values(context));
}

function extractMainBlock(code) {
  const lines = code.split("\n");
  const start = lines.findIndex((line) => line.trim().startsWith("<!"));
  const end = lines.findIndex((line) => line.trim().startsWith("!>"));
  if (start === -1 || end === -1 || end <= start) return null;
  return lines.slice(start + 1, end);
}

function executar() {
  const code = codeArea.value;
  const outputDiv = document.getElementById("output");
  const mainBlockLines = extractMainBlock(code);
  if (!mainBlockLines) {
    outputDiv.innerText = "Bloco principal <! ... !> não encontrado.";
    return;
  }
  let results = [];
  let globalContext = {};
  let localContext = {};
  processBlock(mainBlockLines, 0, localContext, globalContext, results);
  outputDiv.innerText = results.join("\n");
}

function defineLocalVariable(name, expr, localContext, globalContext, results) {
  try {
    localContext[name] = evalWithContext(expr, { ...globalContext, ...localContext });
    results.push(`Variável local '${name}' definida.`);
  } catch (e) {
    results.push(`Erro local '${name}': ${e.message}`);
  }
}

function defineGlobalVariable(name, expr, globalContext, localContext, results) {
  try {
    globalContext[name] = evalWithContext(expr, { ...globalContext, ...localContext });
    results.push(`Variável global '${name}' definida.`);
  } catch (e) {
    results.push(`Erro global '${name}': ${e.message}`);
  }
}

function logLiteral(message, results) {
  results.push(message);
}

function logExpression(expr, localContext, globalContext, results) {
  try {
    let val = evalWithContext(expr, { ...globalContext, ...localContext });
    results.push(val);
  } catch (e) {
    results.push(`Erro no log da expressão: ${e.message}`);
  }
}

function promptCommand(message, results, localContext) {
  const response = prompt(message);
  results.push(`Usuário respondeu: ${response}`);
  localContext.lastInput = response;
}

function alertCommand(message, results) {
  const response = alert(message);
  results.push(response);
}

function evaluateIfElseBlock(condition, ifBlock, elseBlock, localContext, globalContext, results) {
  let condResult = false;
  try {
    condResult = evalWithContext(condition, { ...globalContext, ...localContext });
  } catch (e) {
    results.push(`Erro na condição do if: ${e.message}`);
  }
  if (condResult) {
    processBlock(ifBlock, 0, localContext, globalContext, results);
  } else if (elseBlock) {
    processBlock(elseBlock, 0, localContext, globalContext, results);
  }
}

function processBlock(lines, startIndex, localContext, globalContext, results) {
  let i = startIndex;
  while (i < lines.length) {
    let line = lines[i].trim();
    if (!line || line === "}") {
      i++;
      continue;
    }

    const localMatch = /^local\s+(\w+)\s*=\s*(.+)$/.exec(line);
    if (localMatch) {
      defineLocalVariable(localMatch[1], localMatch[2], localContext, globalContext, results);
      i++;
      continue;
    }

    const globalMatch = /^global\s+(\w+)\s*=\s*(.+)$/.exec(line);
    if (globalMatch) {
      defineGlobalVariable(globalMatch[1], globalMatch[2], globalContext, localContext, results);
      i++;
      continue;
    }

    const ifMatch = /^if\s*\((.+)\)\s*\{$/.exec(line);
    if (ifMatch) {
      let braceCount = 1;
      let ifBlock = [];
      i++;
      while (i < lines.length && braceCount > 0) {
        let l = lines[i];
        braceCount += (l.match(/{/g) || []).length;
        braceCount -= (l.match(/}/g) || []).length;
        if (braceCount > 0) ifBlock.push(l);
        i++;
      }

      let elseBlock = null;
      if (i < lines.length && lines[i].trim() === "else {") {
        i++;
        braceCount = 1;
        elseBlock = [];
        while (i < lines.length && braceCount > 0) {
          let l = lines[i];
          braceCount += (l.match(/{/g) || []).length;
          braceCount -= (l.match(/}/g) || []).length;
          if (braceCount > 0) elseBlock.push(l);
          i++;
        }
      }

      evaluateIfElseBlock(ifMatch[1], ifBlock, elseBlock, localContext, globalContext, results);
      continue;
    }

    const logMatch = /^log\(["'](.+)["']\)$/i.exec(line);
    if (logMatch) {
      logLiteral(logMatch[1], results);
      i++;
      continue;
    }

    const promptMatch = /^prompt\(["'](.+)["']\)$/i.exec(line);
    if (promptMatch) {
      promptCommand(promptMatch[1], results, localContext);
      i++;
      continue;
    }

    const alertMatch = /^alert\(["'](.+)["']\)$/i.exec(line);
    if (alertMatch) {
      alertCommand(alertMatch[1], results);
      i++;
      continue;
    }

    const logExprMatch = /^log\((.+)\)$/i.exec(line);
    if (logExprMatch) {
      logExpression(logExprMatch[1], localContext, globalContext, results);
      i++;
      continue;
    }

    i++;
  }
  return i;
}

function salvar() {
  const blob = new Blob([codeArea.value], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "code.txt";
  link.click();
}

function limpar() {
  codeArea.value = "";
  updateLineNumbers();
  document.getElementById("output").textContent = "";
}

updateLineNumbers();
