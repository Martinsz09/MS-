const codeArea = document.getElementById('codeArea');
const lineNumbers = document.getElementById('lineNumbers');

function updateLineNumbers() {
  const lines = codeArea.value.split('\n').length;
  let lineStr = '';
  for (let i = 1; i <= lines; i++) {
    lineStr += i + '\n';
  }
  lineNumbers.textContent = lineStr;
}

codeArea.addEventListener('input', updateLineNumbers);
codeArea.addEventListener('scroll', () => {
  lineNumbers.scrollTop = codeArea.scrollTop;
});

function evalWithContext(expression, context) {
  return Function(...Object.keys(context), `return ${expression}`)(...Object.values(context));
}

function executar() {
  const code = codeArea.value;
  const outputDiv = document.getElementById('output');
  const lines = code.split('\n');

  let results = [];
  let globalContext = {};
  let localContext = {};

  let insideFunc = false;
  let funcName = '';
  let funcLines = [];
  let braceCount = 0;

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    if (!insideFunc && line.startsWith('func ') && line.includes('{')) {
      const match = /^func\s+(\w+)\s*\(\)\s*\{\s*$/.exec(line);
      if (match) {
        funcName = match[1];
        if (funcName !== 'init') break;
        insideFunc = true;
        braceCount = 1;
        funcLines = [];
        continue;
      }
    }

    if (insideFunc) {
      funcLines.push(rawLine);
      braceCount += (rawLine.match(/{/g) || []).length;
      braceCount -= (rawLine.match(/}/g) || []).length;
      if (braceCount === 0) {
        insideFunc = false;
        break;
      }
      continue;
    }
  }

  if (funcLines.length === 0) {
    outputDiv.innerText = 'Função init() não encontrada.';
    return;
  }

  processBlock(funcLines, 0, localContext, globalContext, results);

  outputDiv.innerText = results.join('\n');
}

function processBlock(lines, startIndex, localContext, globalContext, results) {
  let i = startIndex;
  while (i < lines.length) {
    let line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (line === '}') {
      return i + 1;
    }

    const localMatch = /^local\s+(\w+)\s*=\s*(.+)$/.exec(line);
    if (localMatch) {
      const [, name, expr] = localMatch;
      try {
        localContext[name] = evalWithContext(expr, {...globalContext, ...localContext});
        results.push(`Variável local '${name}' definida.`);
      } catch (e) {
        results.push(`Erro local '${name}': ${e.message}`);
      }
      i++;
      continue;
    }

    const globalMatch = /^global\s+(\w+)\s*=\s*(.+)$/.exec(line);
    if (globalMatch) {
      const [, name, expr] = globalMatch;
      try {
        globalContext[name] = evalWithContext(expr, {...globalContext, ...localContext});
        results.push(`Variável global '${name}' definida.`);
      } catch (e) {
        results.push(`Erro global '${name}': ${e.message}`);
      }
      i++;
      continue;
    }

    const ifMatch = /^if\s*\((.+)\)\s*\{$/.exec(line);
    if (ifMatch) {
      const condition = ifMatch[1];
      let braceCount = 1;
      let blockLines = [];
      i++;
      while (i < lines.length && braceCount > 0) {
        let l = lines[i];
        braceCount += (l.match(/{/g) || []).length;
        braceCount -= (l.match(/}/g) || []).length;
        if (braceCount > 0) blockLines.push(l);
        i++;
      }
      let condResult = false;
      try {
        condResult = evalWithContext(condition, {...globalContext, ...localContext});
        results.push(`Condição do if avaliada como: ${condResult}`);
      } catch (e) {
        results.push(`Erro na condição do if: ${e.message}`);
      }
      if (condResult) {
        processBlock(blockLines, 0, localContext, globalContext, results);
      }
      continue;
    }

    const logMatch = /^log\(["'](.+)["']\)$/i.exec(line);
    if (logMatch) {
      results.push(logMatch[1]);
      i++;
      continue;
    }

    const logExprMatch = /^log\((.+)\)$/i.exec(line);
    if (logExprMatch) {
      try {
        let val = evalWithContext(logExprMatch[1], {...globalContext, ...localContext});
        results.push(val);
      } catch (e) {
        results.push(`Erro no log da expressão: ${e.message}`);
      }
      i++;
      continue;
    }

    i++;
  }
  return i;
}

function salvar() {
  const blob = new Blob([codeArea.value], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'code.txt';
  link.click();
}

function limpar() {
  codeArea.value = '';
  updateLineNumbers();
  document.getElementById('output').textContent = '';
}

updateLineNumbers();
