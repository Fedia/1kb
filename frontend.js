{
  let active;
  const cache = new WeakMap();
  const stops = Symbol();
  const read = (value, ...args) => typeof value === 'function' ? value(...args) : value;

  function signal(value) {
    const subs = new Set();
    return (...args) => {
      if (!args.length) {
        if (active) {
          subs.add(active);
          active.subs.push(subs);
        }
        return value;
      }
      const next = read(args[0], value);
      if (!Object.is(next, value)) {
        value = next;
        for (const run of [...subs]) run();
      }
    };
  }

  function effect(fn) {
    const run = () => {
      for (const subs of run.subs) subs.delete(run);
      run.subs.length = 0;
      if (!fn) return;
      const prev = active;
      active = run;
      try { fn(); } finally { active = prev; }
    };
    run.subs = [];
    run();
    return () => { fn = null; run(); };
  }

  function computed(fn) {
    const value = signal();
    value.dispose = effect(() => value(fn()));
    return value;
  }

  function html(parts, ...values) {
    let tpl = cache.get(parts);
    const marker = '\r\r', token = '&#13;&#13;';
    if (!tpl) {
      tpl = document.createElement('template');
      tpl.innerHTML = parts.join(token);
      cache.set(parts, tpl);
    }
    const root = document.importNode(tpl.content, true);
    let i = 0;
    function bind(node) {
      if (node.attributes?.length) {
        for (const attr of [...node.attributes])
          if (attr.value === marker) render(node, attr.name, values[i++]);
      } else if (node.data) {
        const raw = node.data.includes(token) && node.parentNode.innerHTML === node.data;
        const parts = node.data.split(raw ? token : marker);
        if (parts.length === 1) return;
        const children = [];
        parts.forEach((part, j) => {
          if (j) children.push(j === 1 ? node : document.createTextNode(''));
          if (part) children.push(document.createTextNode(part));
        });
        node.data = '';
        node.replaceWith(...children);
        for (const child of children)
          if (!child.data) render(child, null, values[i++]);
      }
      if (node.firstChild) [...node.childNodes].forEach(bind);
    }
    bind(root);
    return [...root.childNodes];
  }

  function dispose(node) {
    node[stops]?.forEach(read);
    node.childNodes.forEach(dispose);
  }

  const move = (parent, node, next) => {
    if (parent.moveBefore && node.parentNode === parent)
      parent.moveBefore(node, next);
    else parent.insertBefore(node, next);
  };

  const render = (node, attr, value) => {
    let nodes = [];
    if (attr) node.removeAttribute(attr);
    if (attr?.startsWith('on')) { node[attr] = value; return; }
    const update = () => {
      const val = read(value);
      if (attr) {
        if (attr === 'value' || attr === 'checked') node[attr] = val;
        else if (val === false || val == null) node.removeAttribute(attr);
        else node.setAttribute(attr, val);
      } else {
        const next = Array.isArray(val) ? val.flat() : [];
        node.data = Array.isArray(val) ? '' : val ?? '';
        const keep = new Set(next);
        let tail = node;
        for (const old of nodes) {
          if (keep.has(old)) tail = old;
          else { dispose(old); old.remove(); }
        }
        let head = node.nextSibling, left = 0, right = next.length - 1;
        while (left <= right) {
          if (head === next[left]) { head = head.nextSibling; left++; }
          else if (tail === next[right]) { tail = tail.previousSibling; right--; }
          else {
            const last = head === next[right], child = last ? head : next[left++];
            if (last) { head = head.nextSibling; right--; }
            if (child === tail) tail = tail.previousSibling;
            move(node.parentNode, child, last ? tail.nextSibling : head);
          }
        }
        nodes = next;
      }
    };
    if (typeof value === 'function') (node[stops] ||= []).push(effect(update));
    else update();
  };

  function each(value, getKey, tpl) {
    let cache = new Map();
    return () => {
      const items = read(value);
      cache = new Map(items.map((item, i) => {
        const key = getKey(item, i, items);
        return [key, cache.get(key) || tpl(item, i)];
      }));
      return [...cache.values()].flat();
    };
  }
}
