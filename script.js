(function(){
  const exprEl = document.getElementById('expr');
  const resEl = document.getElementById('result');
  const keys = document.getElementById('keys');
  let expr = '';
  let cursorPos = 0;

  function updateDisplay(){
    exprEl.textContent = expr || '0';
    resEl.textContent = previewCompute(expr) ?? '0';
    setCursorPosition(cursorPos);
  }

  function setCursorPosition(pos){
    cursorPos = Math.min(Math.max(0, pos), expr.length);
    const range = document.createRange();
    const sel = window.getSelection();
    if (exprEl.firstChild) {
      range.setStart(exprEl.firstChild, cursorPos);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    exprEl.focus();
  }

  function isOpChar(c){ return ['+','-','*','/','^'].includes(c); }

  function appendValue(v){
    expr = expr.slice(0, cursorPos) + v + expr.slice(cursorPos);
    cursorPos += v.length;
    updateDisplay();
  }

  function backspace(){
    if (cursorPos > 0) {
      expr = expr.slice(0, cursorPos - 1) + expr.slice(cursorPos);
      cursorPos--;
      updateDisplay();
    }
  }

  function clearAll(){
    expr = '';
    cursorPos = 0;
    updateDisplay();
  }

  function previewCompute(input){
    if (!input) return '0';
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
        resEl.textContent = text;
        expr = '';
        cursorPos = 0;
      } else {
        expr = text;
        cursorPos = expr.length;
        resEl.textContent = text;
      }
      exprEl.textContent = expr || '0';
      setCursorPosition(cursorPos);
    } catch(e){
      resEl.textContent = 'Erreur';
    }
  }

  function formatResult(n){
    if (Number.isNaN(n)) return 'Indéterminé';
    if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) return Number(n.toExponential(10)).toString();
    return Number(n.toPrecision(12)).toString();
  }

  // --- Analyse et calcul ---
  function evaluateExpression(input){
    const tokens = tokenize(input);
    const rpn = toRPN(tokens);
    return evalRPN(rpn);
  }

  function tokenize(s){
    const tokens = []; let i = 0;
    while(i < s.length){
      const ch = s[i];
      if (/\d/.test(ch) || ch === '.'){
        let num = '';
        while(i < s.length && (/\d/.test(s[i]) || s[i]==='.')){ num+=s[i]; i++; }
        tokens.push(num);
        continue;
      }
      if (['+','-','*','/','^','(',')','√'].includes(ch)){
        tokens.push(ch); i++; continue;
      }
      i++;
    }
    return tokens;
  }

  function toRPN(tokens){
    const out = [], ops = [];
    const prec = { '+':1, '-':1, '*':2, '/':2, '^':3, '√':4 };
    const rightAssoc = { '^': true, '√': true };
    for(const t of tokens){
      if (/\d/.test(t[0])){ out.push(t); }
      else if (t === '('){ ops.push(t); }
      else if (t === ')'){
        while(ops.length && ops[ops.length-1] !== '('){ out.push(ops.pop()); }
        ops.pop();
      }
      else {
        while(
          ops.length &&
          ops[ops.length-1] !== '(' &&
          (
            rightAssoc[t]
              ? prec[ops[ops.length-1]] > prec[t]
              : prec[ops[ops.length-1]] >= prec[t]
          )
        ){ out.push(ops.pop()); }
        ops.push(t);
      }
    }
    while(ops.length) out.push(ops.pop());
    return out;
  }

  function evalRPN(rpn){
    const st = [];
    for(const t of rpn){
      if (/\d/.test(t[0])) st.push(Number(t));
      else if (t === '√'){
        const a = st.pop();
        st.push(Math.sqrt(a));
      }
      else {
        const b = st.pop(), a = st.pop();
        st.push(operate(a,b,t));
      }
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
    if (op==='^') return Math.pow(a,b);
    return NaN;
  }

  // --- Gestion UI ---
  keys.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const v = btn.dataset.value;
    const action = btn.dataset.action;
    if (action === 'clear') return clearAll();
    if (action === 'del') return backspace();
    if (action === 'equals') return computeNow();
    if (v !== undefined) appendValue(v);
  });

  exprEl.addEventListener('input', (e) => {
    expr = exprEl.textContent;
    const sel = window.getSelection();
    cursorPos = sel.focusOffset;
    updateDisplay();
  });

  exprEl.addEventListener('click', () => {
    const sel = window.getSelection();
    cursorPos = sel.focusOffset;
  });

  document.addEventListener('keydown', (e) => {
    if (/[0-9]/.test(e.key)) { appendValue(e.key); e.preventDefault(); }
    else if (['+','-','*','/','^','(',')','.'].includes(e.key)) { appendValue(e.key); e.preventDefault(); }
    else if (e.key.toLowerCase() === 'r') { appendValue('√'); e.preventDefault(); }
    else if (e.key === 'Enter') { computeNow(); e.preventDefault(); }
    else if (e.key === 'Backspace') { backspace(); e.preventDefault(); }
    else if (e.key === 'Escape') { clearAll(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') {
      cursorPos = Math.max(0, cursorPos - 1);
      setCursorPosition(cursorPos);
      e.preventDefault();
    }
    else if (e.key === 'ArrowRight') {
      cursorPos = Math.min(expr.length, cursorPos + 1);
      setCursorPosition(cursorPos);
      e.preventDefault();
    }
  });

  updateDisplay();
})();