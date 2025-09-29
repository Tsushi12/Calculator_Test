(function(){
  const exprEl = document.getElementById('expr');
  const resEl = document.getElementById('result');
  const keys = document.getElementById('keys');
  let expr = '';

  function updateDisplay(){
    exprEl.textContent = expr || '0';
    resEl.textContent = previewCompute(expr) ?? '0';
  }

  function isOpChar(c){ return c === '+' || c === '-' || c === '*' || c === '/'; }
  function getLastChar(){ return expr.slice(-1); }
  function getLastNumber(){
    let i = expr.length - 1, s = '';
    while(i >= 0){
      const ch = expr[i];
      if (isOpChar(ch)) break;
      s = ch + s; i--;
    }
    return s;
  }

  function appendDigit(d){
    if (d === '.'){
      const last = getLastNumber();
      if (last.includes('.')) return;
      if (last === '' || last === '-') expr += '0.';
      else expr += '.';
    } else {
      expr += d;
    }
    updateDisplay();
  }

  function appendOperator(op){
    if (!expr){ if (op === '-') { expr = '-'; updateDisplay(); } return; }
    const last = getLastChar();
    const secondLast = expr.slice(-2,-1);
    if (isOpChar(last)){
      if (last === '-' && isOpChar(secondLast)){
        expr = expr.slice(0,-2) + op;
      } else if (op === '-' && (last === '+' || last === '*' || last === '/')){
        expr += '-';
      } else {
        expr = expr.slice(0,-1) + op;
      }
    } else {
      expr += op;
    }
    updateDisplay();
  }

  function backspace(){ expr = expr.slice(0,-1); updateDisplay(); }
  function clearAll(){ expr = ''; updateDisplay(); }

  function previewCompute(input){
    if (!input) return '0';
    if (/^[+\/*]/.test(input)) return '';
    if (/[+\-*/]$/.test(input)) input = input.slice(0,-1);
    try {
      const val = evaluateExpression(input);
      return formatResult(val);
    } catch(e){ return ''; }
  }

  function computeNow(){
    if (!expr) return;
    try {
      const value = evaluateExpression(expr);
      const text = formatResult(value);
      if (['Indéterminé','∞','-∞'].includes(text)){
        resEl.textContent = text; expr = '';
      } else {
        expr = text; resEl.textContent = text;
      }
      exprEl.textContent = expr || '0';
    } catch(e){ resEl.textContent = 'Erreur'; }
  }

  function formatResult(n){
    if (Number.isNaN(n)) return 'Indéterminé';
    if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) return Number(n.toExponential(10)).toString();
    return Number(n.toPrecision(12)).toString();
  }

  function evaluateExpression(input){
    if (!input) return 0;
    const tokens = tokenize(input);
    const rpn = toRPN(tokens);
    return evalRPN(rpn);
  }

  function tokenize(s){
    const tokens = []; let i = 0;
    while(i < s.length){
      const ch = s[i];
      if (ch === ' '){ i++; continue; }
      if (ch === '+' || ch === '*' || ch === '/'){ tokens.push(ch); i++; continue; }
      if (ch === '-'){
        if (tokens.length === 0 || isOpChar(tokens[tokens.length-1])){
          let j = i + 1, num = '-'; let hasDigit = false;
          while(j < s.length && (/\d/.test(s[j]) || s[j] === '.')){
            if (/\d/.test(s[j])) hasDigit = true;
            num += s[j]; j++;
          }
          if (!hasDigit){ tokens.push('-'); i++; continue; }
          tokens.push(num); i = j; continue;
        } else { tokens.push('-'); i++; continue; }
      }
      if (/\d/.test(ch) || ch === '.'){
        let j = i, num = '', dotCount = 0;
        while(j < s.length && (/\d/.test(s[j]) || s[j] === '.')){
          if (s[j] === '.') dotCount++;
          if (dotCount > 1) throw new Error('Nombre mal formé');
          num += s[j]; j++;
        }
        tokens.push(num); i = j; continue;
      }
      i++;
    }
    return tokens;
  }

  function toRPN(tokens){
    const out = [], ops = [], prec = { '+':1,'-':1,'*':2,'/':2 };
    for(const t of tokens){
      if (isOpChar(t)){
        while(ops.length && isOpChar(ops[ops.length-1]) && prec[ops[ops.length-1]] >= prec[t]) out.push(ops.pop());
        ops.push(t);
      } else out.push(t);
    }
    while(ops.length) out.push(ops.pop());
    return out;
  }

  function evalRPN(rpn){
    const st = [];
    for(const t of rpn){
      if (isOpChar(t)){
        const b = st.pop(), a = st.pop();
        st.push(operate(a,b,t));
      } else st.push(Number(t));
    }
    if (st.length !== 1) throw new Error('Expression incorrecte');
    return st[0];
  }

  function operate(a,b,op){
    if (!isFinite(a) || !isFinite(b)) return NaN;
    if (op==='+') return a+b;
    if (op==='-') return a-b;
    if (op==='*') return a*b;
    if (op==='/'){
      if (Math.abs(b) < Number.EPSILON){
        if (Math.abs(a) < Number.EPSILON) return NaN;
        return a > 0 ? Infinity : -Infinity;
      }
      return a/b;
    }
    return NaN;
  }

  keys.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    const v = btn.dataset.value;
    const action = btn.dataset.action;
    if (action === 'clear') return clearAll();
    if (action === 'del') return backspace();
    if (action === 'equals') return computeNow();
    if (v !== undefined){
      if (/[0-9]/.test(v)) appendDigit(v);
      else if (v === '.') appendDigit('.');
      else if (['+','-','*','/'].includes(v)) appendOperator(v);
    }
  });

  document.addEventListener('keydown',(e)=>{
    if (e.key >= '0' && e.key <= '9'){ appendDigit(e.key); e.preventDefault(); }
    else if (e.key === '.') { appendDigit('.'); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === '='){ computeNow(); e.preventDefault(); }
    else if (['+','-','*','/'].includes(e.key)){ appendOperator(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace'){ backspace(); e.preventDefault(); }
    else if (e.key === 'Escape' || e.key.toLowerCase() === 'c'){ clearAll(); e.preventDefault(); }
  });

  updateDisplay();
})();
