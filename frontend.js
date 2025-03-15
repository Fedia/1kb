/* 1KB Frontend Library
* https://dev.to/fedia/1kb-frontend-library-5ef1
*/

{
  const effects = [Function.prototype];
  const disposed = new WeakSet();

  function signal(value) {
    const subs = new Set();
    return (newVal) => {
      if (newVal === undefined) {
        subs.add(effects.at(-1));
        return value;
      }
      if (newVal !== value) {
        value = newVal?.call ? newVal(value) : newVal;
        for (let eff of subs) disposed.has(eff) ? subs.delete(eff) : eff();
      }
    };
  }

  function effect(fn) {
    effects.push(fn);
    try {
      fn();
      return () => disposed.add(fn);
    } finally {
      effects.pop();
    }
  }
}

function computed(fn) {
  const s = signal();
  s.dispose = effect(() => s(fn()));
  return s;
}

{
  function html(tpl, ...data) {
    const marker = "\ufeff";
    const t = document.createElement("template");
    t.innerHTML = tpl.join(marker);
    if (tpl.length > 1) {
      const iter = document.createNodeIterator(t.content, 1 | 4);
      let n,
        idx = 0;
      while ((n = iter.nextNode())) {
        if (n.attributes) {
          if (n.attributes.length)
            for (let attr of [...n.attributes])
              if (attr.value == marker) render(n, attr.name, data[idx++]);
        } else {
          if (n.nodeValue.includes(marker)) {
            let tmp = document.createElement("template");
            tmp.innerHTML = n.nodeValue.replaceAll(marker, "<!>");
            for (let child of tmp.content.childNodes)
              if (child.nodeType == 8) render(child, null, data[idx++]);
            n.replaceWith(tmp.content);
          }
        }
      }
    }
    return [...t.content.childNodes];
  }

  const render = (node, attr, value) => {
    const run = value?.call
      ? (fn) => {
          let dispose;
          dispose = effect(() =>
            dispose && !node.isConnected ? dispose() : fn(value())
          );
        }
      : (fn) => fn(value);
    if (attr) {
      node.removeAttribute(attr);
      if (attr.startsWith("on")) node[attr] = value;
      else
        run((val) => {
          if (attr == "value" || attr == "checked") node[attr] = val;
          else
            val === false
              ? node.removeAttribute(attr)
              : node.setAttribute(attr, val);
        });
    } else {
      const key = Symbol();
      run((val) => {
        const upd = Array.isArray(val)
          ? val.flat()
          : val !== undefined
          ? [document.createTextNode(val)]
          : [];
        for (let n of upd) n[key] = true;
        let a = node,
          b;
        while ((a = a.nextSibling) && a[key]) {
          b = upd.shift();
          if (a !== b) {
            if (b) a.replaceWith(b);
            else {
              b = a.previousSibling;
              a.remove();
            }
            a = b;
          }
        }
        if (upd.length) (b || node).after(...upd);
      });
    }
  };
}

function each(val, getKey, tpl) {
  let a = [];
  let aNodes = [];
  return () => {
    const items = val?.call ? val() : val;
    const b = items.map(getKey);
    const aIdx = new Map(a.map((...kv) => kv));
    const bIdx = new Map(b.map((...kv) => kv));
    const bNodes = [];
    for (let i = 0, j = 0; i != a.length || j != b.length; ) {
      let aElm = a[i],
        bElm = b[j];
      if (aElm === null) i++;
      else if (b.length <= j) aNodes[i++].remove();
      else if (a.length <= i) bNodes.push(tpl(items[j], j++)[0]);
      else if (aElm === bElm) bNodes[j++] = aNodes[i++];
      else {
        let oldIdx = aIdx.get(bElm);
        if (bIdx.get(aElm) === undefined) aNodes[i++].remove();
        else if (oldIdx === undefined) {
          bNodes[j] = tpl(items[j], j)[0];
          aNodes[i].before(bNodes[j++]);
        } else {
          bNodes[j++] = aNodes[oldIdx];
          aNodes[i].before(aNodes[oldIdx]);
          a[oldIdx] = null;
          if (oldIdx > i + 1) i++;
        }
      }
    }
    a = b;
    aNodes = bNodes;
    return [...aNodes];
  };
}
