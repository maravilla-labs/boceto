// ../../node_modules/.pnpm/yoga-layout@3.2.1/node_modules/yoga-layout/dist/binaries/yoga-wasm-base64-esm.js

// ../core/dist/index.js
var ELEMENT_TYPES = [
  // Layout
  "box",
  "card",
  "modal",
  "navbar",
  "divider",
  "sidebar",
  // Typography
  "heading",
  "label",
  "breadcrumb",
  // Form
  "input",
  "textarea",
  "button",
  "primary-button",
  "select",
  "checkbox",
  "radio",
  "switch",
  "slider",
  "search",
  "segmented-control",
  // Media
  "image",
  "video",
  "avatar",
  // Content
  "list",
  "table",
  "tabs",
  "badge",
  "progress",
  "pagination",
  "alert",
  "chip",
  "code-block",
  "accordion",
  "chat-bubble",
  "calendar",
  // Navigation / overlays
  "dropdown-menu",
  "tooltip",
  "toast",
  // Feedback
  "spinner",
  "skeleton",
  // Data viz
  "chart-bar",
  "chart-line",
  "chart-donut",
  // Mobile chrome
  "phone-frame",
  "status-bar",
  "home-indicator",
  "fab",
  "app-icon",
  // System chrome
  "window-frame",
  "browser-frame",
  "terminal",
  // Form (long-tail)
  "combobox",
  "date-picker",
  "color-picker",
  "file-upload",
  "rating",
  "otp-input",
  "tag-input",
  "stepper-input",
  "range-slider",
  // Content (long-tail)
  "tree",
  "stepper",
  "carousel",
  "popover",
  "kbd",
  "quote",
  "status-dot",
  "notification-bell",
  "mention",
  "ai-suggestion",
  "presence-cursor",
  // Data viz (long-tail)
  "chart-area",
  "chart-sparkline",
  "gantt",
  "heatmap",
  "map",
  "code-diff",
  // AR / spatial
  "glass-window",
  "gaze-cursor",
  "pinch-indicator",
  "volumetric-scene",
  "passthrough-frame",
  "voice-input"
];
var DEFAULT_SLOT = "";
function isComponentInstance(item) {
  return "kind" in item && item.kind === "component-instance";
}
function isFlexContainer(item) {
  return "kind" in item && item.kind === "flex-container";
}
function isSlot(item) {
  return "kind" in item && item.kind === "slot";
}
var FENCE_RE = /```boceto(?::([^\n]*))?\n([\s\S]*?)```/g;
var PAGE_SEP_RE = /^---(?:\s+(.*))?$/;
var STATEMENT_KEYWORDS = /* @__PURE__ */ new Set([
  "element",
  "text",
  "arrow",
  "row",
  "col",
  "end",
  "component",
  "slot"
]);
function extractBlocks(source) {
  const fenceMatches = [...source.matchAll(FENCE_RE)];
  if (fenceMatches.length > 0) {
    return fenceMatches.map((m) => ({
      name: m[1]?.trim() || void 0,
      body: m[2] ?? ""
    }));
  }
  if (!looksLikeStandalone(source)) return [];
  const lines = source.split("\n");
  const blocks = [];
  let current = null;
  for (const raw of lines) {
    const sep = raw.match(PAGE_SEP_RE);
    if (sep) {
      if (current) blocks.push(current);
      current = { name: sep[1]?.trim() || void 0, body: "" };
      continue;
    }
    if (current) current.body += (current.body ? "\n" : "") + raw;
    else current = { body: raw };
  }
  if (current) blocks.push(current);
  return blocks;
}
function looksLikeStandalone(source) {
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("---")) return true;
    const firstWord = line.split(/\s+/)[0] ?? "";
    return STATEMENT_KEYWORDS.has(firstWord);
  }
  return false;
}
function tokenize(line) {
  const out = [];
  const len = line.length;
  let i = 0;
  while (i < len) {
    const ch = line[i];
    if (ch === " " || ch === "	") {
      i++;
      continue;
    }
    if (ch === '"') {
      const { value, end } = readQuoted(line, i + 1);
      out.push({ value, quoted: true });
      i = end;
      continue;
    }
    let buf = "";
    while (i < len && line[i] !== " " && line[i] !== "	") {
      if (line[i] === '"') {
        const { value, end } = readQuoted(line, i + 1);
        buf += value;
        i = end;
      } else {
        buf += line[i];
        i++;
      }
    }
    out.push({ value: buf, quoted: false });
  }
  return out;
}
function readQuoted(line, start) {
  const len = line.length;
  let j = start;
  let buf = "";
  while (j < len) {
    const c = line[j];
    if (c === "\\" && j + 1 < len) {
      const next = line[j + 1];
      if (next === '"' || next === "\\") {
        buf += next;
        j += 2;
        continue;
      }
      if (next === "n") {
        buf += "\n";
        j += 2;
        continue;
      }
      if (next === "t") {
        buf += "	";
        j += 2;
        continue;
      }
    }
    if (c === '"') break;
    buf += c;
    j++;
  }
  return { value: buf, end: j + 1 };
}
var BocetoParseError = class extends Error {
  constructor(message, line, source) {
    super(message);
    this.line = line;
    this.source = source;
    this.name = "BocetoParseError";
  }
  line;
  source;
};
var FLEX_DIRECTION_VALUES = ["row", "col"];
var FLEX_JUSTIFY_VALUES = [
  "start",
  "middle",
  "end",
  "between",
  "around",
  "evenly"
];
var FLEX_ALIGN_VALUES = ["start", "middle", "end", "stretch"];
var FLEX_WRAP_VALUES = ["nowrap", "wrap", "wrap-reverse"];
function parseAttrs(tokens, lineNo, raw) {
  const attrs = {};
  for (const tok of tokens) {
    if (tok.quoted) continue;
    const eq = tok.value.indexOf("=");
    if (eq < 1) {
      throw new BocetoParseError(
        `Expected key=value attribute, got "${tok.value}"`,
        lineNo + 1,
        raw
      );
    }
    const key = tok.value.slice(0, eq);
    const valStr = tok.value.slice(eq + 1);
    const num = Number(valStr);
    attrs[key] = valStr !== "" && !Number.isNaN(num) ? num : valStr;
  }
  return attrs;
}
function splitTypeAndId(tok) {
  const v = tok.value;
  const hash = v.indexOf("#");
  if (hash < 0) return { type: v, namedId: void 0 };
  return { type: v.slice(0, hash), namedId: v.slice(hash + 1) };
}
var ALIGN_SELF_VALUES = [
  "auto",
  "start",
  "middle",
  "end",
  "stretch"
];
function extractFlexChildProps(attrs, lineNo, raw) {
  const out = {};
  if ("grow" in attrs) {
    out.grow = consumeNonNegativeNumber(attrs, "grow", lineNo, raw);
  }
  if ("shrink" in attrs) {
    out.shrink = consumeNonNegativeNumber(attrs, "shrink", lineNo, raw);
  }
  if ("basis" in attrs) {
    const v = attrs.basis;
    if (v === "auto") out.basis = "auto";
    else if (typeof v === "number" && Number.isFinite(v) && v >= 0) out.basis = v;
    else {
      throw new BocetoParseError(
        `'basis' must be a non-negative number or "auto", got "${String(v)}"`,
        lineNo + 1,
        raw
      );
    }
    delete attrs.basis;
  }
  if ("align-self" in attrs) {
    const v = attrs["align-self"];
    if (typeof v !== "string" || !ALIGN_SELF_VALUES.includes(v)) {
      throw new BocetoParseError(
        `'align-self' must be one of ${ALIGN_SELF_VALUES.map((a) => `"${a}"`).join(", ")}; got "${String(v)}"`,
        lineNo + 1,
        raw
      );
    }
    out.alignSelf = v;
    delete attrs["align-self"];
  }
  for (const [key, field] of [
    ["min-w", "minW"],
    ["min-h", "minH"],
    ["max-w", "maxW"],
    ["max-h", "maxH"]
  ]) {
    if (key in attrs) {
      out[field] = consumeNonNegativeNumber(attrs, key, lineNo, raw);
    }
  }
  return out;
}
function consumeNonNegativeNumber(attrs, key, lineNo, raw) {
  const v = attrs[key];
  delete attrs[key];
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    throw new BocetoParseError(
      `'${key}' must be a non-negative number, got "${String(v)}"`,
      lineNo + 1,
      raw
    );
  }
  return v;
}
function consumeEnum(attrs, key, allowed, ownerKeyword, lineNo, raw) {
  if (!(key in attrs)) return void 0;
  const v = attrs[key];
  delete attrs[key];
  if (typeof v !== "string" || !allowed.includes(v)) {
    throw new BocetoParseError(
      `'${ownerKeyword}' attribute '${key}' must be one of ${allowed.map((a) => `"${a}"`).join(", ")}; got "${String(v)}"`,
      lineNo + 1,
      raw
    );
  }
  return v;
}
function consumeOptionalNumber(attrs, key, ownerKeyword, lineNo, raw) {
  if (!(key in attrs)) return void 0;
  const v = attrs[key];
  delete attrs[key];
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    throw new BocetoParseError(
      `'${ownerKeyword}' attribute '${key}' must be a non-negative number, got "${String(v)}"`,
      lineNo + 1,
      raw
    );
  }
  return v;
}
var NAMED_ID_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;
function posInt(tok, name, lineNo, raw) {
  const n = Number(tok.value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new BocetoParseError(
      `'${name}' must be a non-negative integer, got "${tok.value}"`,
      lineNo + 1,
      raw
    );
  }
  return n;
}
function posIntOrAuto(tok, name, lineNo, raw) {
  if (!tok.quoted && tok.value === "auto") return "auto";
  return posInt(tok, name, lineNo, raw);
}
var ELEMENT_TYPE_SET = new Set(ELEMENT_TYPES);
function parseElementOrInstance(tokens, pageIndex, auto, lineNo, raw, componentMap) {
  if (tokens.length < 7) {
    throw new BocetoParseError(
      `'element' requires: TYPE X Y W H "label" (got ${tokens.length - 1} args)`,
      lineNo + 1,
      raw
    );
  }
  const typeTok = tokens[1];
  const { type } = splitTypeAndId(typeTok);
  const component = componentMap.get(type);
  if (component) {
    return parseComponentInstance(tokens, pageIndex, auto, lineNo, raw, component, componentMap);
  }
  return parseElement(tokens, pageIndex, auto, lineNo, raw);
}
function parseElement(tokens, pageIndex, auto, lineNo, raw) {
  const [, typeTok, xTok, yTok, wTok, hTok, labelTok, ...rest] = tokens;
  const { type, namedId } = splitTypeAndId(typeTok);
  if (!ELEMENT_TYPE_SET.has(type)) {
    throw new BocetoParseError(`Unknown element type "${type}"`, lineNo + 1, raw);
  }
  if (namedId !== void 0 && !NAMED_ID_RE.test(namedId)) {
    throw new BocetoParseError(
      `Named id "${namedId}" must match [A-Za-z][A-Za-z0-9_-]*`,
      lineNo + 1,
      raw
    );
  }
  if (!labelTok.quoted) {
    throw new BocetoParseError(`'element' label must be a quoted string`, lineNo + 1, raw);
  }
  let note;
  let attrStart = 0;
  if (rest.length > 0 && rest[0].quoted) {
    note = rest[0].value;
    attrStart = 1;
  }
  const attrs = parseAttrs(rest.slice(attrStart), lineNo, raw);
  const attrId = typeof attrs.id === "string" ? attrs.id : void 0;
  if (namedId !== void 0 && attrId !== void 0 && namedId !== attrId) {
    throw new BocetoParseError(
      `Conflicting ids: shorthand "${namedId}" vs id="${attrId}"`,
      lineNo + 1,
      raw
    );
  }
  const id = namedId ?? attrId ?? `p${pageIndex}e${auto}`;
  if ("id" in attrs) delete attrs.id;
  const flex = extractFlexChildProps(attrs, lineNo, raw);
  const container = extractContainerAttrs(attrs, type, lineNo, raw);
  return {
    id,
    type,
    x: posInt(xTok, "x", lineNo, raw),
    y: posInt(yTok, "y", lineNo, raw),
    // `auto` is accepted on built-in elements (especially useful when the
    // element has block-form children and should size to its content). It's
    // stored as `0`, which the layout pass already treats as "no preferred
    // size" — semantically identical to `auto` everywhere else.
    w: autoOrPosInt(wTok, "w", lineNo, raw),
    h: autoOrPosInt(hTok, "h", lineNo, raw),
    label: labelTok.value,
    note,
    attrs,
    ...flex,
    ...container
  };
}
function autoOrPosInt(tok, name, lineNo, raw) {
  const result = posIntOrAuto(tok, name, lineNo, raw);
  return result === "auto" ? 0 : result;
}
function extractContainerAttrs(attrs, ownerKeyword, lineNo, raw) {
  const out = {};
  const direction = consumeEnum(
    attrs,
    "direction",
    FLEX_DIRECTION_VALUES,
    ownerKeyword,
    lineNo,
    raw
  );
  if (direction) out.direction = direction;
  const gap = consumeOptionalNumber(attrs, "gap", ownerKeyword, lineNo, raw);
  if (gap != null) out.gap = gap;
  const padding = consumeOptionalNumber(attrs, "padding", ownerKeyword, lineNo, raw);
  if (padding != null) out.padding = padding;
  const justify = consumeEnum(
    attrs,
    "justify",
    FLEX_JUSTIFY_VALUES,
    ownerKeyword,
    lineNo,
    raw
  );
  if (justify) out.justify = justify;
  const align = consumeEnum(attrs, "align", FLEX_ALIGN_VALUES, ownerKeyword, lineNo, raw);
  if (align) out.align = align;
  const wrap = consumeEnum(attrs, "wrap", FLEX_WRAP_VALUES, ownerKeyword, lineNo, raw);
  if (wrap) out.wrap = wrap;
  return out;
}
function parseComponentInstance(tokens, pageIndex, auto, lineNo, raw, component, componentMap) {
  const [, typeTok, xTok, yTok, wTok, hTok, labelTok, ...rest] = tokens;
  const { namedId } = splitTypeAndId(typeTok);
  if (namedId !== void 0 && !NAMED_ID_RE.test(namedId)) {
    throw new BocetoParseError(
      `Named id "${namedId}" must match [A-Za-z][A-Za-z0-9_-]*`,
      lineNo + 1,
      raw
    );
  }
  if (!labelTok.quoted) {
    throw new BocetoParseError(
      `Composite reference label slot must be present (use "")`,
      lineNo + 1,
      raw
    );
  }
  let attrStart = 0;
  if (rest.length > 0 && rest[0].quoted) attrStart = 1;
  const attrsRaw = parseAttrs(rest.slice(attrStart), lineNo, raw);
  const attrId = typeof attrsRaw.id === "string" ? attrsRaw.id : void 0;
  if (namedId !== void 0 && attrId !== void 0 && namedId !== attrId) {
    throw new BocetoParseError(
      `Conflicting ids: shorthand "${namedId}" vs id="${attrId}"`,
      lineNo + 1,
      raw
    );
  }
  const id = namedId ?? attrId ?? `p${pageIndex}c${auto}`;
  if ("id" in attrsRaw) delete attrsRaw.id;
  const callFlex = extractFlexChildProps(attrsRaw, lineNo, raw);
  const params = {};
  for (const [k, v] of Object.entries(attrsRaw)) params[k] = String(v);
  const x = posInt(xTok, "x", lineNo, raw);
  const y = posInt(yTok, "y", lineNo, raw);
  const wTokVal = posIntOrAuto(wTok, "w", lineNo, raw);
  const hTokVal = posIntOrAuto(hTok, "h", lineNo, raw);
  const wExplicit = wTokVal === "auto" || wTokVal === 0 ? void 0 : wTokVal;
  const hExplicit = hTokVal === "auto" || hTokVal === 0 ? void 0 : hTokVal;
  const defaults = component.defaults ?? {};
  const effective = {
    grow: callFlex.grow ?? defaults.grow,
    shrink: callFlex.shrink ?? defaults.shrink,
    basis: callFlex.basis ?? defaults.basis,
    alignSelf: callFlex.alignSelf ?? defaults.alignSelf,
    minW: callFlex.minW ?? defaults.minW,
    minH: callFlex.minH ?? defaults.minH,
    maxW: callFlex.maxW ?? defaults.maxW,
    maxH: callFlex.maxH ?? defaults.maxH
  };
  return {
    kind: "component-instance",
    id,
    componentName: component.name,
    x,
    y,
    w: wExplicit ?? defaults.w ?? "auto",
    h: hExplicit ?? defaults.h ?? "auto",
    params,
    expanded: expandInstance(component, id, x, y, params, componentMap),
    ...stripUndefined(effective)
  };
}
function stripUndefined(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== void 0) out[k] = v;
  }
  return out;
}
function parseText(tokens, pageIndex, auto, lineNo, raw) {
  if (tokens.length < 4) {
    throw new BocetoParseError(`'text' requires: X Y "text"`, lineNo + 1, raw);
  }
  const [, xTok, yTok, textTok, ...rest] = tokens;
  if (!textTok.quoted) {
    throw new BocetoParseError(`'text' content must be a quoted string`, lineNo + 1, raw);
  }
  const attrs = parseAttrs(rest, lineNo, raw);
  const id = typeof attrs.id === "string" ? attrs.id : `p${pageIndex}e${auto}`;
  if ("id" in attrs) delete attrs.id;
  const w = typeof attrs.w === "number" ? attrs.w : 200;
  const h = typeof attrs.h === "number" ? attrs.h : 24;
  if ("w" in attrs) delete attrs.w;
  if ("h" in attrs) delete attrs.h;
  const flex = extractFlexChildProps(attrs, lineNo, raw);
  return {
    id,
    type: "label",
    x: posInt(xTok, "x", lineNo, raw),
    y: posInt(yTok, "y", lineNo, raw),
    w,
    h,
    label: textTok.value,
    attrs,
    ...flex
  };
}
function parseArrow(tokens, pageIndex, auto, lineNo, raw) {
  if (tokens.length < 3) {
    throw new BocetoParseError(`'arrow' requires: FROM_ID TO_ID`, lineNo + 1, raw);
  }
  const [, fromTok, toTok, labelTok] = tokens;
  if (fromTok.quoted || toTok.quoted) {
    throw new BocetoParseError(`arrow IDs must be unquoted identifiers`, lineNo + 1, raw);
  }
  const label = labelTok && labelTok.quoted ? labelTok.value : void 0;
  return {
    id: `p${pageIndex}a${auto}`,
    from: fromTok.value,
    to: toTok.value,
    label
  };
}
function parseLayoutFrame(kind, tokens, pageIndex, auto, lineNo, raw) {
  if (tokens.length < 5) {
    throw new BocetoParseError(
      `'${kind}' requires: X Y W H [gap=N align=... justify=... padding=N wrap=... ...]`,
      lineNo + 1,
      raw
    );
  }
  const headTok = tokens[0];
  const { namedId } = splitTypeAndId(headTok);
  if (namedId !== void 0 && !NAMED_ID_RE.test(namedId)) {
    throw new BocetoParseError(
      `Named id "${namedId}" must match [A-Za-z][A-Za-z0-9_-]*`,
      lineNo + 1,
      raw
    );
  }
  const [, xTok, yTok, wTok, hTok, ...rest] = tokens;
  const attrs = parseAttrs(rest, lineNo, raw);
  const attrId = typeof attrs.id === "string" ? attrs.id : void 0;
  if (namedId !== void 0 && attrId !== void 0 && namedId !== attrId) {
    throw new BocetoParseError(
      `Conflicting ids: shorthand "${namedId}" vs id="${attrId}"`,
      lineNo + 1,
      raw
    );
  }
  const id = namedId ?? attrId ?? `p${pageIndex}f${auto}`;
  if ("id" in attrs) delete attrs.id;
  const gap = consumeOptionalNumber(attrs, "gap", kind, lineNo, raw) ?? 0;
  const padding = consumeOptionalNumber(attrs, "padding", kind, lineNo, raw) ?? 0;
  const align = consumeEnum(attrs, "align", FLEX_ALIGN_VALUES, kind, lineNo, raw) ?? (kind === "row" ? "middle" : "start");
  const justify = consumeEnum(attrs, "justify", FLEX_JUSTIFY_VALUES, kind, lineNo, raw) ?? "start";
  const wrap = consumeEnum(attrs, "wrap", FLEX_WRAP_VALUES, kind, lineNo, raw) ?? "nowrap";
  const childFlex = extractFlexChildProps(attrs, lineNo, raw);
  const extra = Object.keys(attrs);
  if (extra.length > 0) {
    throw new BocetoParseError(
      `Unknown '${kind}' attribute(s): ${extra.map((k) => `"${k}"`).join(", ")}`,
      lineNo + 1,
      raw
    );
  }
  return {
    kind: "flex-container",
    id,
    direction: kind,
    x: posInt(xTok, "x", lineNo, raw),
    y: posInt(yTok, "y", lineNo, raw),
    w: posIntOrAuto(wTok, "w", lineNo, raw),
    h: posIntOrAuto(hTok, "h", lineNo, raw),
    padding,
    gap,
    justify,
    align,
    wrap,
    ...childFlex,
    children: [],
    startLine: lineNo
  };
}
function parsePage(name, pageIndex, body, componentMap, options = {}) {
  const items = [];
  const arrows = [];
  let autoCounter = 1;
  const stack = [];
  const lines = body.split("\n");
  const allowSlotMarker = options.allowSlotMarker === true;
  function pushItem(item, lineNo, raw) {
    if (stack.length === 0) {
      items.push(item);
      return;
    }
    const top = stack[stack.length - 1];
    if (top.ftype === "slot") {
      if (isSlotMarker(item)) {
        throw new BocetoParseError(
          `'slot' markers belong in component bodies, not in slot-fill blocks`,
          lineNo + 1,
          raw
        );
      }
      top.children.push(item);
      return;
    }
    if (top.ftype === "instance") {
      if (isSlotMarker(item)) {
        throw new BocetoParseError(
          `'slot' markers belong in component bodies, not in composite call sites`,
          lineNo + 1,
          raw
        );
      }
      top.defaultSlot.push(item);
      return;
    }
    if (top.ftype === "element-container") {
      if (isSlotMarker(item)) {
        throw new BocetoParseError(
          `'slot' markers belong in component bodies, not inside an element's children block`,
          lineNo + 1,
          raw
        );
      }
      top.children.push(item);
      return;
    }
    if (isSlotMarker(item)) {
      throw new BocetoParseError(
        `'slot' markers belong in component bodies, not inside a 'row' or 'col'`,
        lineNo + 1,
        raw
      );
    }
    top.frame.children.push(item);
  }
  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const raw = lines[lineNo] ?? "";
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    const tokens = tokenize(trimmed);
    if (tokens.length === 0) continue;
    let blockOpen = false;
    const last = tokens[tokens.length - 1];
    if (!last.quoted && last.value === ":") {
      blockOpen = true;
      tokens.pop();
    }
    const head = tokens[0];
    if (!head || head.quoted) {
      throw new BocetoParseError(
        `Expected statement keyword, got "${head?.value ?? ""}"`,
        lineNo + 1,
        raw
      );
    }
    const headKeyword = head.value.split("#")[0];
    switch (headKeyword) {
      case "element": {
        const item = parseElementOrInstance(
          tokens,
          pageIndex,
          autoCounter++,
          lineNo,
          raw,
          componentMap
        );
        if (blockOpen) {
          if (isComponentInstance(item)) {
            stack.push({
              ftype: "instance",
              startLine: lineNo,
              instance: item,
              defaultSlot: [],
              namedSlots: /* @__PURE__ */ new Map()
            });
          } else {
            stack.push({
              ftype: "element-container",
              startLine: lineNo,
              element: item,
              children: []
            });
          }
        } else {
          pushItem(item, lineNo, raw);
        }
        break;
      }
      case "text":
        if (blockOpen) {
          throw new BocetoParseError(`'text' does not accept a children block`, lineNo + 1, raw);
        }
        pushItem(parseText(tokens, pageIndex, autoCounter++, lineNo, raw), lineNo, raw);
        break;
      case "arrow":
        if (blockOpen) {
          throw new BocetoParseError(`'arrow' does not accept a children block`, lineNo + 1, raw);
        }
        arrows.push(parseArrow(tokens, pageIndex, autoCounter++, lineNo, raw));
        break;
      case "row":
      case "col": {
        const frame = parseLayoutFrame(headKeyword, tokens, pageIndex, autoCounter++, lineNo, raw);
        stack.push({ ftype: "layout", frame });
        break;
      }
      case "slot": {
        if (stack.length > 0 && stack[stack.length - 1].ftype === "instance") {
          const slotName = parseSlotName(
            tokens,
            lineNo,
            raw,
            /* requireName */
            true
          );
          stack.push({ ftype: "slot", startLine: lineNo, name: slotName, children: [] });
          break;
        }
        if (allowSlotMarker) {
          const slotName = parseSlotName(
            tokens,
            lineNo,
            raw,
            /* requireName */
            false
          );
          const slot = { kind: "slot" };
          if (slotName) slot.name = slotName;
          pushItem(slot, lineNo, raw);
          break;
        }
        throw new BocetoParseError(
          `'slot' is only valid inside a component body or inside a composite call's children block`,
          lineNo + 1,
          raw
        );
      }
      case "end": {
        const frame = stack.pop();
        if (!frame) {
          throw new BocetoParseError(
            `'end' with no matching 'row', 'col', 'component', composite call, or 'slot' block`,
            lineNo + 1,
            raw
          );
        }
        if (frame.ftype === "layout") {
          const { startLine: _drop, ...container } = frame.frame;
          pushItem(container, lineNo, raw);
        } else if (frame.ftype === "element-container") {
          frame.element.children = frame.children;
          pushItem(frame.element, lineNo, raw);
        } else if (frame.ftype === "instance") {
          const slotContent = {};
          if (frame.defaultSlot.length > 0) slotContent[DEFAULT_SLOT] = frame.defaultSlot;
          for (const [k, v] of frame.namedSlots) slotContent[k] = v;
          if (Object.keys(slotContent).length > 0) {
            const comp = componentMap.get(frame.instance.componentName);
            if (!comp) {
              throw new BocetoParseError(
                `Unknown component "${frame.instance.componentName}"`,
                lineNo + 1,
                raw
              );
            }
            const re = expandInstance(
              comp,
              frame.instance.id,
              frame.instance.x,
              frame.instance.y,
              frame.instance.params,
              componentMap,
              /* @__PURE__ */ new Set(),
              slotContent
            );
            frame.instance.expanded = re;
            frame.instance.slots = slotContent;
          }
          pushItem(frame.instance, lineNo, raw);
        } else {
          const parent = stack[stack.length - 1];
          if (!parent || parent.ftype !== "instance") {
            throw new BocetoParseError(
              `'slot ${frame.name} \u2026 end' must close inside a composite call's children block`,
              lineNo + 1,
              raw
            );
          }
          if (parent.namedSlots.has(frame.name)) {
            throw new BocetoParseError(
              `Duplicate 'slot ${frame.name}' at this composite call site`,
              lineNo + 1,
              raw
            );
          }
          parent.namedSlots.set(frame.name, frame.children);
        }
        break;
      }
      default:
        throw new BocetoParseError(`Unknown statement keyword "${head.value}"`, lineNo + 1, raw);
    }
  }
  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (top.ftype === "layout") {
      throw new BocetoParseError(
        `Unclosed '${top.frame.direction}' (started on line ${top.frame.startLine + 1}); expected 'end'`,
        top.frame.startLine + 1
      );
    }
    if (top.ftype === "instance") {
      throw new BocetoParseError(
        `Unclosed composite call (started on line ${top.startLine + 1}); expected 'end'`,
        top.startLine + 1
      );
    }
    if (top.ftype === "element-container") {
      throw new BocetoParseError(
        `Unclosed 'element ${top.element.type}' block (started on line ${top.startLine + 1}); expected 'end'`,
        top.startLine + 1
      );
    }
    throw new BocetoParseError(
      `Unclosed 'slot ${top.name}' (started on line ${top.startLine + 1}); expected 'end'`,
      top.startLine + 1
    );
  }
  return { id: `p${pageIndex}`, name, elements: items, arrows };
}
function isSlotMarker(item) {
  return "kind" in item && item.kind === "slot";
}
function parseSlotName(tokens, lineNo, raw, requireName) {
  if (tokens.length === 1) {
    if (requireName) {
      throw new BocetoParseError(
        `'slot' at a call site requires a NAME (use 'slot NAME ... end')`,
        lineNo + 1,
        raw
      );
    }
    return void 0;
  }
  if (tokens.length > 2) {
    throw new BocetoParseError(`'slot' takes at most one argument (the slot name)`, lineNo + 1, raw);
  }
  const nameTok = tokens[1];
  if (nameTok.quoted) {
    throw new BocetoParseError(`Slot name must be an unquoted identifier`, lineNo + 1, raw);
  }
  if (!NAMED_ID_RE.test(nameTok.value)) {
    throw new BocetoParseError(
      `Slot name "${nameTok.value}" must match [A-Za-z][A-Za-z0-9_-]*`,
      lineNo + 1,
      raw
    );
  }
  return nameTok.value;
}
var COMPONENT_HEADER_RE = /^component\s+([A-Za-z][A-Za-z0-9_-]*)\s*(?:\(([^)]*)\))?\s*(.*)$/;
var PARAM_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
var ELEMENT_TYPE_SET2 = new Set(ELEMENT_TYPES);
function collectComponentDefinitions(blocks) {
  const raw = [];
  const rest = blocks.map((block) => {
    const { raw: blockRaw, body } = extractFromOneBlock(block.body);
    raw.push(...blockRaw);
    return { name: block.name, body };
  });
  return { raw, blocks: rest };
}
function extractFromOneBlock(body) {
  const lines = body.split("\n");
  const out = lines.slice();
  const raw = [];
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i] ?? "";
    const trimmed = rawLine.trim();
    if (!trimmed.startsWith("component")) {
      i++;
      continue;
    }
    const m = trimmed.match(COMPONENT_HEADER_RE);
    if (!m) {
      i++;
      continue;
    }
    const name = m[1];
    const params = m[2] ? m[2].split(",").map((s) => s.trim()).filter((s) => s.length > 0) : [];
    const headerAttrs = (m[3] ?? "").trim();
    const bodyStart = i + 1;
    let depth = 1;
    let bodyEnd = -1;
    for (let j = bodyStart; j < lines.length; j++) {
      const l = (lines[j] ?? "").trim();
      if (!l || l.startsWith("#")) continue;
      const head = l.split(/\s+/)[0].split("#")[0];
      if (head === "row" || head === "col") depth++;
      else if (head === "end") {
        depth--;
        if (depth === 0) {
          bodyEnd = j;
          break;
        }
      } else if (head === "component") {
        throw new BocetoParseError(
          `Nested 'component' definitions are not allowed in v0.1`,
          j + 1,
          lines[j] ?? ""
        );
      }
    }
    if (bodyEnd < 0) {
      throw new BocetoParseError(
        `Unclosed 'component ${name}' (started on line ${i + 1}); expected 'end'`,
        i + 1,
        rawLine
      );
    }
    raw.push({
      name,
      params,
      headerAttrs,
      headerRaw: rawLine,
      body: lines.slice(bodyStart, bodyEnd).join("\n"),
      headerLine: i
    });
    for (let k = i; k <= bodyEnd; k++) out[k] = "";
    i = bodyEnd + 1;
  }
  return { raw, body: out.join("\n") };
}
function parseComponentBodies(raw) {
  const components = raw.map((r2) => {
    const { shell, defaults } = parseComponentHeaderAttrs(r2);
    const c = { name: r2.name, params: r2.params, body: [] };
    if (shell) c.shell = shell;
    if (defaults) c.defaults = defaults;
    return c;
  });
  const componentMap = new Map(
    components.map((c) => [c.name, c])
  );
  for (let i = 0; i < raw.length; i++) {
    const r2 = raw[i];
    const page = parsePage("__component__", 0, r2.body, componentMap, {
      allowSlotMarker: true
    });
    const body = [];
    for (const item of page.elements) {
      body.push(item);
    }
    for (const ar of page.arrows) body.push(ar);
    components[i].body = body;
  }
  return components;
}
function parseComponentHeaderAttrs(r2) {
  if (!r2.headerAttrs) return {};
  const attrs = parseAttrs(tokenize(r2.headerAttrs), r2.headerLine, r2.headerRaw);
  let shell;
  if ("direction" in attrs) {
    const direction = consumeEnum(
      attrs,
      "direction",
      FLEX_DIRECTION_VALUES,
      "component",
      r2.headerLine,
      r2.headerRaw
    );
    const padding = consumeOptionalNumber(attrs, "padding", "component", r2.headerLine, r2.headerRaw) ?? 0;
    const gap = consumeOptionalNumber(attrs, "gap", "component", r2.headerLine, r2.headerRaw) ?? 0;
    const justify = consumeEnum(attrs, "justify", FLEX_JUSTIFY_VALUES, "component", r2.headerLine, r2.headerRaw) ?? "start";
    const align = consumeEnum(attrs, "align", FLEX_ALIGN_VALUES, "component", r2.headerLine, r2.headerRaw) ?? (direction === "row" ? "middle" : "start");
    const wrap = consumeEnum(attrs, "wrap", FLEX_WRAP_VALUES, "component", r2.headerLine, r2.headerRaw) ?? "nowrap";
    shell = { direction, padding, gap, justify, align, wrap };
  }
  const defaults = {};
  if ("w" in attrs) defaults.w = consumeDimDefault(attrs, "w", r2.headerLine, r2.headerRaw);
  if ("h" in attrs) defaults.h = consumeDimDefault(attrs, "h", r2.headerLine, r2.headerRaw);
  Object.assign(defaults, extractFlexChildProps(attrs, r2.headerLine, r2.headerRaw));
  const extra = Object.keys(attrs);
  if (extra.length > 0) {
    throw new BocetoParseError(
      `Unknown 'component ${r2.name}' attribute(s): ${extra.map((k) => `"${k}"`).join(", ")}`,
      r2.headerLine + 1,
      r2.headerRaw
    );
  }
  return {
    shell,
    defaults: Object.keys(defaults).length > 0 ? defaults : void 0
  };
}
function consumeDimDefault(attrs, key, lineNo, raw) {
  const v = attrs[key];
  delete attrs[key];
  if (v === "auto") return "auto";
  if (typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && v >= 0) return v;
  throw new BocetoParseError(
    `'component' attribute '${key}' must be a non-negative integer or "auto", got "${String(v)}"`,
    lineNo + 1,
    raw
  );
}
function validateComponents(components) {
  const seen = /* @__PURE__ */ new Set();
  for (const c of components) {
    if (ELEMENT_TYPE_SET2.has(c.name)) {
      throw new BocetoParseError(
        `Component name "${c.name}" collides with built-in element type`
      );
    }
    if (seen.has(c.name)) {
      throw new BocetoParseError(`Duplicate component definition: "${c.name}"`);
    }
    seen.add(c.name);
    const paramsSeen = /* @__PURE__ */ new Set();
    for (const p of c.params) {
      if (!PARAM_RE.test(p)) {
        throw new BocetoParseError(`Component "${c.name}" has invalid param "${p}"`);
      }
      if (paramsSeen.has(p)) {
        throw new BocetoParseError(`Component "${c.name}" has duplicate param "${p}"`);
      }
      paramsSeen.add(p);
    }
  }
}
function expandInstance(component, instanceId, originX, originY, params, componentMap, visiting = /* @__PURE__ */ new Set(), slotContent = {}) {
  if (visiting.has(component.name)) {
    const chain = [...visiting, component.name].join(" \u2192 ");
    throw new BocetoParseError(`Cyclic component reference: ${chain}`);
  }
  const next = new Set(visiting);
  next.add(component.name);
  const declaredSlotNames = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of component.body) {
    if ("from" in item && "to" in item) continue;
    if (isSlot(item)) {
      const slotName = item.name ?? DEFAULT_SLOT;
      declaredSlotNames.add(slotName);
      const slotChildren = slotContent[slotName] ?? [];
      for (const sc of slotChildren) {
        out.push(...expandPageItem(sc, instanceId, originX, originY, params, componentMap, next));
      }
      continue;
    }
    if (isComponentInstance(item)) {
      const nested = componentMap.get(item.componentName);
      if (!nested) {
        throw new BocetoParseError(`Unknown component "${item.componentName}"`);
      }
      const nestedParams = {};
      for (const [k, v] of Object.entries(item.params)) {
        nestedParams[k] = substituteParams(v, params);
      }
      const nestedInstanceId = `${instanceId}.${item.id}`;
      const nestedItemX = typeof item.x === "number" ? item.x : 0;
      const nestedItemY = typeof item.y === "number" ? item.y : 0;
      const nestedExpanded = expandInstance(
        {
          ...nested
          // Pass the (unexpanded) call-site slot content through. Nested
          // instances may themselves declare slots — those get filled by
          // whatever the *outer* nested call site supplied for them.
        },
        nestedInstanceId,
        originX + nestedItemX,
        originY + nestedItemY,
        nestedParams,
        componentMap,
        next,
        item.slots
        // slot content from the nested call site
      );
      out.push({
        ...item,
        id: nestedInstanceId,
        x: originX + nestedItemX,
        y: originY + nestedItemY,
        params: nestedParams,
        expanded: nestedExpanded
      });
      continue;
    }
    if (isFlexContainer(item)) {
      out.push(translateFlexContainer(item, originX, originY, params, instanceId));
      continue;
    }
    out.push(translateElement(item, originX, originY, params, instanceId));
  }
  for (const slotName of Object.keys(slotContent)) {
    if (!declaredSlotNames.has(slotName)) {
      const label = slotName === DEFAULT_SLOT ? "default slot" : `slot "${slotName}"`;
      throw new BocetoParseError(
        `Component "${component.name}" has no ${label} \u2014 call site supplied children for it`
      );
    }
  }
  return out;
}
function expandPageItem(item, instanceId, originX, originY, params, componentMap, visiting) {
  if (isComponentInstance(item)) {
    const nested = componentMap.get(item.componentName);
    if (!nested) {
      throw new BocetoParseError(`Unknown component "${item.componentName}"`);
    }
    const nestedParams = {};
    for (const [k, v] of Object.entries(item.params)) {
      nestedParams[k] = substituteParams(v, params);
    }
    const nestedInstanceId = `${instanceId}.${item.id}`;
    const nestedItemX = typeof item.x === "number" ? item.x : 0;
    const nestedItemY = typeof item.y === "number" ? item.y : 0;
    return [
      {
        ...item,
        id: nestedInstanceId,
        x: originX + nestedItemX,
        y: originY + nestedItemY,
        params: nestedParams,
        expanded: expandInstance(
          nested,
          nestedInstanceId,
          originX + nestedItemX,
          originY + nestedItemY,
          nestedParams,
          componentMap,
          visiting,
          item.slots
        )
      }
    ];
  }
  if (isFlexContainer(item)) {
    return [translateFlexContainer(item, originX, originY, params, instanceId)];
  }
  return [translateElement(item, originX, originY, params, instanceId)];
}
function translateElement(el, dx, dy, params, idPrefix) {
  const subbedAttrs = {};
  for (const [k, v] of Object.entries(el.attrs)) {
    subbedAttrs[k] = typeof v === "string" ? substituteParams(v, params) : v;
  }
  return {
    ...el,
    id: `${idPrefix}.${el.id}`,
    x: el.x + dx,
    y: el.y + dy,
    label: substituteParams(el.label, params),
    note: el.note != null ? substituteParams(el.note, params) : void 0,
    attrs: subbedAttrs
  };
}
function translateFlexContainer(c, dx, dy, params, idPrefix) {
  return {
    ...c,
    id: `${idPrefix}.${c.id}`,
    x: c.x + dx,
    y: c.y + dy,
    children: c.children.map((child) => translateChild(child, dx, dy, params, idPrefix))
  };
}
function translateChild(item, dx, dy, params, idPrefix) {
  if (isFlexContainer(item)) return translateFlexContainer(item, dx, dy, params, idPrefix);
  if (isComponentInstance(item)) {
    return {
      ...item,
      id: `${idPrefix}.${item.id}`,
      x: item.x + dx,
      y: item.y + dy
    };
  }
  return translateElement(item, dx, dy, params, idPrefix);
}
var VAR_BRACED_RE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
var VAR_BARE_RE = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
function substituteParams(s, params) {
  return s.replace(VAR_BRACED_RE, (_, name) => params[name] ?? "").replace(VAR_BARE_RE, (_, name) => params[name] ?? "");
}
function parse(source, options = {}) {
  if (options.raw) {
    return {
      pages: [parsePage("Page 1", 0, source, /* @__PURE__ */ new Map())],
      components: []
    };
  }
  const rawBlocks = extractBlocks(source);
  const importSources = options.imports ? Array.isArray(options.imports) ? options.imports : [options.imports] : [];
  const importBlocks = importSources.flatMap((src) => extractBlocks(src));
  const { raw: ownRawComponents, blocks: blocksForPages } = collectComponentDefinitions(rawBlocks);
  const { raw: importRawComponents } = importBlocks.length > 0 ? collectComponentDefinitions(importBlocks) : { raw: [] };
  const allParsed = parseComponentBodies([...importRawComponents, ...ownRawComponents]);
  const components = allParsed.slice(importRawComponents.length);
  validateComponents(components);
  const componentMap = /* @__PURE__ */ new Map();
  for (const c of allParsed) componentMap.set(c.name, c);
  const pages = [];
  let pageIndex = 0;
  for (const block of blocksForPages) {
    const trimmedBody = block.body.trim();
    if (!trimmedBody) continue;
    const name = block.name ?? `Page ${pageIndex + 1}`;
    pages.push(parsePage(name, pageIndex, block.body, componentMap));
    pageIndex++;
  }
  if (pages.length === 0) {
    pages.push({ id: "p0", name: "Page 1", elements: [], arrows: [] });
  }
  return { pages, components };
}
var REGISTRY = /* @__PURE__ */ new Map();
function registerElement(type, renderer) {
  REGISTRY.set(type, renderer);
}
function sketchRect(s, x, y, w, h, { fill = "#fff", stroke = "#333", lw = 2, r: r2 = 1.5 } = {}) {
  const pts = [
    [s.jitter(x, r2), s.jitter(y, r2)],
    [s.jitter(x + w, r2), s.jitter(y, r2)],
    [s.jitter(x + w, r2), s.jitter(y + h, r2)],
    [s.jitter(x, r2), s.jitter(y + h, r2)]
  ];
  const d = `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]} L ${pts[2][0]} ${pts[2][1]} L ${pts[3][0]} ${pts[3][1]} Z`;
  s.path(d, { fill, stroke, strokeWidth: lw });
  if (stroke && stroke !== "transparent") {
    s.group({ opacity: 0.3 }, () => {
      s.line(
        s.jitter(x, r2 * 0.4),
        s.jitter(y - 0.5, r2 * 0.4),
        s.jitter(x + w, r2 * 0.4),
        s.jitter(y - 0.5, r2 * 0.4),
        { stroke, strokeWidth: lw }
      );
    });
  }
}
function sketchLine(s, x1, y1, x2, y2, { stroke = "#333", lw = 1.5, dash = [] } = {}) {
  s.line(s.jitter(x1, 0.8), s.jitter(y1, 0.8), s.jitter(x2, 0.8), s.jitter(y2, 0.8), {
    stroke,
    strokeWidth: lw,
    dash: dash.length ? dash : void 0
  });
}
function sketchText(s, text, x, y, {
  size = 14,
  color = "#222",
  align = "left",
  base: base2 = "top",
  bold = false,
  italic = false,
  maxW,
  font
} = {}) {
  s.text(text, x, y, {
    size,
    color,
    align,
    baseline: base2,
    bold,
    italic,
    maxWidth: maxW,
    font
  });
}
function fitText(s, text, x, y, maxW, opts = {}) {
  const t = text ?? "";
  const measure = {
    size: opts.size ?? 14,
    bold: opts.bold,
    italic: opts.italic,
    font: opts.font
  };
  const renderOpts = {
    size: measure.size,
    color: opts.color ?? "#222",
    align: opts.align ?? "left",
    baseline: opts.base ?? "top",
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    font: opts.font,
    maxWidth: maxW
  };
  if (s.measureText(t, measure).width <= maxW) {
    s.text(t, x, y, renderOpts);
    return;
  }
  const ELL = "\u2026";
  const ellW = s.measureText(ELL, measure).width;
  if (ellW > maxW) {
    return;
  }
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    const candidate = t.slice(0, mid);
    const w = s.measureText(candidate, measure).width + ellW;
    if (w <= maxW) lo = mid;
    else hi = mid - 1;
  }
  const prefix = t.slice(0, lo).replace(/\s+$/, "");
  s.text(prefix + ELL, x, y, renderOpts);
}
function shrinkFitText(s, text, x, y, maxW, opts = {}) {
  const t = text ?? "";
  const maxSize = opts.size ?? 14;
  const minSize = Math.max(6, opts.minFontSize ?? 9);
  let chosen = maxSize;
  if (s.measureText(t, { size: maxSize, bold: opts.bold, italic: opts.italic, font: opts.font }).width > maxW) {
    let lo = minSize;
    let hi = maxSize;
    for (let i = 0; i < 8 && lo + 0.5 < hi; i++) {
      const mid = (lo + hi) / 2;
      const w = s.measureText(t, {
        size: mid,
        bold: opts.bold,
        italic: opts.italic,
        font: opts.font
      }).width;
      if (w <= maxW) lo = mid;
      else hi = mid;
    }
    chosen = Math.max(minSize, Math.floor(lo));
  }
  s.text(t, x, y, {
    size: chosen,
    color: opts.color ?? "#222",
    align: opts.align ?? "left",
    baseline: opts.base ?? "top",
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    font: opts.font,
    maxWidth: maxW
  });
}
function wrapText(s, text, x, y, maxW, lineH, maxLines = 99, textOpts = {}) {
  const baseOpts = {
    size: textOpts.size ?? 13,
    bold: textOpts.bold,
    italic: textOpts.italic,
    font: textOpts.font
  };
  const renderBase = {
    size: baseOpts.size,
    color: textOpts.color ?? "#222",
    bold: textOpts.bold ?? false,
    italic: textOpts.italic ?? false,
    font: textOpts.font
  };
  const align = textOpts.align ?? "left";
  const anchorX = align === "left" ? x : align === "right" ? x + maxW : x + maxW / 2;
  const hardCap = textOpts.maxH != null && lineH > 0 ? Math.max(1, Math.min(maxLines, Math.floor(textOpts.maxH / lineH))) : maxLines;
  const ELL = "\u2026";
  const ellW = s.measureText(ELL, baseOpts).width;
  const out = [];
  const segments = (text ?? "").split("\n");
  outer: for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx];
    if (seg === "") {
      out.push("");
      if (out.length >= hardCap) break outer;
      continue;
    }
    const words = seg.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (s.measureText(test, baseOpts).width > maxW && line) {
        out.push(line);
        if (out.length >= hardCap) {
          attachEllipsis(out, ellW, maxW, baseOpts, s);
          break outer;
        }
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      out.push(line);
      if (out.length >= hardCap) {
        if (segIdx < segments.length - 1) {
          attachEllipsis(out, ellW, maxW, baseOpts, s);
        }
        break outer;
      }
    }
  }
  for (let i = 0; i < out.length; i++) {
    s.text(out[i], anchorX, y + i * lineH, {
      ...renderBase,
      align,
      baseline: "top",
      maxWidth: maxW
    });
  }
}
function attachEllipsis(out, ellW, maxW, measure, s) {
  if (out.length === 0) return;
  let last = out[out.length - 1];
  while (last.length > 0 && s.measureText(last + "\u2026", measure).width > maxW) {
    last = last.slice(0, -1);
  }
  out[out.length - 1] = last.replace(/\s+$/, "") + "\u2026";
}
function clipText(s, text, x, y, w, h, opts = {}) {
  s.group({ clip: { x, y, w, h } }, () => {
    s.text(text, opts.align === "right" ? x + w : opts.align === "center" ? x + w / 2 : x, y, {
      size: opts.size ?? 14,
      color: opts.color ?? "#222",
      align: opts.align ?? "left",
      baseline: opts.base ?? "top",
      bold: opts.bold ?? false,
      italic: opts.italic ?? false,
      font: opts.font,
      maxWidth: w
    });
  });
}
function paintLabel(s, el, text, opts) {
  const policy = el.attrs.overflow ?? opts.policy;
  const align = el.attrs.textAlign ?? opts.align;
  const inset = opts.inset ?? 0;
  const bb = opts.bbox ?? { x: el.x, y: el.y, w: el.w, h: el.h };
  const ix = bb.x + inset;
  const iy = bb.y + inset;
  const iw = Math.max(0, bb.w - 2 * inset);
  const ih = Math.max(0, bb.h - 2 * inset);
  const lineH = opts.lineH ?? Math.round(opts.size * 1.25);
  const anchorX = align === "left" ? ix : align === "right" ? ix + iw : ix + iw / 2;
  const baseline = opts.baseline ?? "top";
  const anchorY = baseline === "top" ? iy : baseline === "bottom" ? iy + ih : iy + ih / 2;
  const baselineProp = baseline === "top" ? "top" : baseline === "bottom" ? "bottom" : "middle";
  const common = {
    size: opts.size,
    color: opts.color,
    bold: opts.bold,
    italic: opts.italic,
    font: opts.font,
    align,
    base: baselineProp
  };
  if (policy === "wrap") {
    const lines = Math.max(1, Math.floor(ih / lineH));
    wrapText(s, text ?? "", ix, iy, iw, lineH, opts.maxLines ?? lines, {
      size: opts.size,
      color: opts.color,
      bold: opts.bold,
      italic: opts.italic,
      font: opts.font,
      align,
      maxH: ih
    });
    return;
  }
  if (policy === "clip") {
    clipText(s, text ?? "", ix, iy, iw, ih, { ...common });
    return;
  }
  if (policy === "shrink") {
    const minFontSize = numericAttr(el.attrs.minFontSize, 9);
    shrinkFitText(s, text ?? "", anchorX, anchorY, iw, { ...common, minFontSize });
    return;
  }
  fitText(s, text ?? "", anchorX, anchorY, iw, common);
}
function numericAttr(v, fallback) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
var PALETTE = {
  selection: "#4a90d9",
  hover: "#7bb3e8",
  bg: "rgba(255,255,255,0.92)",
  default: "#444"
};
function strokeColor(state) {
  return state.selected ? PALETTE.selection : state.hovered ? PALETTE.hover : PALETTE.default;
}
function fillColor(state) {
  return state.selected ? "#e8f4fd" : state.hovered ? "#f0f8ff" : PALETTE.bg;
}
var r = (type, fn) => registerElement(type, { draw: fn });
r("box", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: fillColor(st),
    stroke: strokeColor(st),
    lw: st.selected ? 2.5 : 1.8
  });
  if (el.label) {
    wrapText(s, el.label, el.x + 6, el.y + 6, el.w - 12, 16, 2, { size: 13, color: "#555" });
  }
});
r("card", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: fillColor(st),
    stroke: strokeColor(st),
    lw: st.selected ? 2.5 : 1.8
  });
  if (el.label) {
    wrapText(s, el.label, el.x + 6, el.y + 6, el.w - 12, 16, 2, { size: 13, color: "#555" });
  }
  sketchLine(s, el.x + 1, el.y + 32, el.x + el.w - 1, el.y + 32, { stroke: "#ccc" });
});
r("button", (s, el, st) => {
  const bg = st.selected ? "#d0e8fa" : st.hovered ? "#e0eefc" : "#e8e8e8";
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: strokeColor(st), lw: 2.2 });
  paintLabel(s, el, el.label || "Button", {
    policy: "ellipsis",
    align: "center",
    baseline: "middle",
    size: 13,
    bold: true,
    color: "#111",
    inset: 8
  });
});
r("primary-button", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: st.selected ? "#2e6baa" : "#3b82c4",
    stroke: st.selected ? PALETTE.selection : "#1a5590",
    lw: 2
  });
  paintLabel(s, el, el.label || "Submit", {
    policy: "ellipsis",
    align: "center",
    baseline: "middle",
    size: 13,
    bold: true,
    color: "#fff",
    inset: 8
  });
});
r("input", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "rgba(255,255,255,.97)",
    stroke: strokeColor(st),
    lw: 1.5
  });
  paintLabel(s, el, el.label || "placeholder\u2026", {
    policy: "ellipsis",
    align: "left",
    baseline: "middle",
    italic: true,
    size: 13,
    color: "#aaa",
    inset: 8
  });
  sketchLine(s, el.x + 8, el.y + 6, el.x + 8, el.y + el.h - 6, { stroke: "#999", lw: 1 });
});
r("textarea", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "rgba(255,255,255,.97)",
    stroke: strokeColor(st),
    lw: 1.5
  });
  paintLabel(s, el, el.label || "Enter text\u2026", {
    policy: "wrap",
    align: "left",
    baseline: "top",
    italic: !el.label,
    // only italic-grey when showing the placeholder
    size: 13,
    color: el.label ? "#222" : "#aaa",
    inset: 8,
    lineH: 16
  });
  for (let i = 0; i < 3; i++) {
    s.line(el.x + el.w - 10 + i * 3, el.y + el.h - 4, el.x + el.w - 4, el.y + el.h - 10 + i * 3, {
      stroke: "#ccc",
      strokeWidth: 1
    });
  }
});
r("checkbox", (s, el, st) => {
  const sz = 16;
  sketchRect(s, el.x, el.y + (el.h - sz) / 2, sz, sz, { fill: "#fff", stroke: strokeColor(st) });
  s.path(
    `M ${el.x + 3} ${el.y + (el.h - sz) / 2 + sz / 2} L ${el.x + sz / 2 - 1} ${el.y + (el.h + sz) / 2 - 3} L ${el.x + sz - 2} ${el.y + (el.h - sz) / 2 + 3}`,
    { stroke: "#555", strokeWidth: 2, lineCap: "round" }
  );
  sketchText(s, el.label || "Option", el.x + sz + 7, el.y + el.h / 2, { base: "middle", size: 14 });
});
r("radio", (s, el, st) => {
  const sz = 16;
  const cx = el.x + sz / 2;
  const cy = el.y + el.h / 2;
  s.arc(s.jitter(cx, 0.5), s.jitter(cy, 0.5), sz / 2, {
    fill: "#fff",
    stroke: strokeColor(st),
    strokeWidth: 1.8
  });
  s.arc(cx, cy, sz / 4, { fill: "#555" });
  sketchText(s, el.label || "Option", el.x + sz + 7, el.y + el.h / 2, { base: "middle", size: 14 });
});
r("select", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "rgba(255,255,255,.97)",
    stroke: strokeColor(st),
    lw: 1.5
  });
  paintLabel(s, el, el.label || "Choose\u2026", {
    policy: "ellipsis",
    align: "left",
    baseline: "middle",
    size: 13,
    color: "#555",
    inset: 8,
    bbox: { x: el.x, y: el.y, w: el.w - 20, h: el.h }
  });
  s.path(
    `M ${el.x + el.w - 18} ${el.y + el.h / 2 - 3} L ${el.x + el.w - 10} ${el.y + el.h / 2 + 4} L ${el.x + el.w - 2} ${el.y + el.h / 2 - 3}`,
    { stroke: "#777", strokeWidth: 1.5 }
  );
});
r("image", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#f0f0ec", stroke: strokeColor(st), lw: 2 });
  sketchLine(s, el.x + 6, el.y + 6, el.x + el.w - 6, el.y + el.h - 6, { stroke: "#ccc", lw: 1.5 });
  sketchLine(s, el.x + el.w - 6, el.y + 6, el.x + 6, el.y + el.h - 6, { stroke: "#ccc", lw: 1.5 });
  sketchText(s, el.label || "image", el.x + el.w / 2, el.y + el.h / 2 + 10, {
    align: "center",
    base: "middle",
    italic: true,
    size: 12,
    color: "#aaa"
  });
  s.arc(el.x + el.w * 0.35, el.y + el.h * 0.35, el.h * 0.1, { fill: "#ddd" });
});
r("video", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#1a1a2e", stroke: strokeColor(st), lw: 2 });
  s.path(
    `M ${el.x + el.w / 2 - 12} ${el.y + el.h / 2 - 16} L ${el.x + el.w / 2 + 16} ${el.y + el.h / 2} L ${el.x + el.w / 2 - 12} ${el.y + el.h / 2 + 16} Z`,
    { fill: "rgba(255,255,255,.7)" }
  );
  sketchText(s, el.label || "video", el.x + el.w / 2, el.y + el.h - 14, {
    align: "center",
    base: "middle",
    size: 12,
    color: "#888"
  });
});
r("navbar", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "#2d2d3a",
    stroke: st.selected ? PALETTE.selection : "#111",
    lw: 2
  });
  sketchText(s, el.label || "Brand", el.x + 12, el.y + el.h / 2, {
    base: "middle",
    bold: true,
    size: 14,
    color: "#fff"
  });
  const items = pipeListAttr(el, "items", ["Home", "About", "Contact"]);
  let nx = el.x + el.w - 10;
  for (const ni of items) {
    const tw = s.measureText(ni, { size: 12 }).width;
    nx -= tw + 18;
    sketchText(s, ni, nx + tw / 2, el.y + el.h / 2, {
      align: "center",
      base: "middle",
      size: 12,
      color: "#ccc"
    });
  }
});
r("label", (s, el, st) => {
  const fontSize = numAttr(el, "fontSize", 15);
  paintLabel(s, el, el.label || "Text label", {
    policy: "wrap",
    align: "left",
    baseline: "top",
    size: fontSize,
    color: st.selected ? PALETTE.selection : "#222",
    lineH: Math.round(fontSize * 1.25)
  });
  if (st.selected || st.hovered) selDash(s, el, st);
});
r("heading", (s, el, st) => {
  const fontSize = numAttr(el, "fontSize", 22);
  paintLabel(s, el, el.label || "Heading", {
    policy: "wrap",
    align: "left",
    baseline: "middle",
    size: fontSize,
    bold: true,
    color: "#111",
    lineH: Math.round(fontSize * 1.2)
  });
  if (st.selected || st.hovered) selDash(s, el, st);
});
r("divider", (s, el, st) => {
  sketchLine(s, el.x, el.y + el.h / 2, el.x + el.w, el.y + el.h / 2, { stroke: "#aaa", lw: 2 });
  if (st.selected) {
    s.rect(el.x - 2, el.y - 4, el.w + 4, el.h + 8, {
      stroke: PALETTE.selection,
      strokeWidth: 1
    });
  }
});
r("table", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st) });
  const dataAttr = strAttr(el, "data", "");
  const dataRows = dataAttr ? dataAttr.split(";").map((r2) => r2.split("|").map((c) => c.trim())) : [];
  const headers = pipeListAttr(el, "headers", []);
  const cols = el.attrs.cols != null && typeof el.attrs.cols === "number" ? el.attrs.cols : dataRows.length > 0 ? Math.max(...dataRows.map((r2) => r2.length)) : headers.length > 0 ? headers.length : 3;
  const rows = el.attrs.rows != null && typeof el.attrs.rows === "number" ? el.attrs.rows : dataRows.length > 0 ? dataRows.length + 1 : 4;
  const cw = el.w / cols;
  const rh = el.h / rows;
  sketchRect(s, el.x, el.y, el.w, rh, { fill: "#e8e8e8", stroke: "transparent" });
  for (let c = 0; c < cols; c++) {
    const headerText = headers[c] ?? `Col ${c + 1}`;
    sketchText(s, headerText, el.x + c * cw + cw / 2, el.y + rh / 2, {
      align: "center",
      base: "middle",
      bold: true,
      size: 12
    });
  }
  for (let i = 1; i < rows; i++) {
    sketchLine(s, el.x, el.y + i * rh, el.x + el.w, el.y + i * rh, { stroke: "#ddd" });
  }
  for (let c = 1; c < cols; c++) {
    sketchLine(s, el.x + c * cw, el.y, el.x + c * cw, el.y + el.h, { stroke: "#ddd" });
  }
  for (let row = 1; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      let txt;
      if (dataRows.length > 0) {
        txt = dataRows[row - 1]?.[c] ?? "";
      } else {
        txt = row <= 2 && c === 0 ? "\u25CF Item" : row === 1 && c === 1 ? "Value" : "\xB7\xB7\xB7";
      }
      if (txt) {
        sketchText(s, txt, el.x + c * cw + 6, el.y + row * rh + rh / 2, {
          base: "middle",
          size: 11,
          color: "#666"
        });
      }
    }
  }
});
r("list", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: fillColor(st), stroke: strokeColor(st) });
  const items = pipeListAttr(el, "items", ["Item one", "Item two", "Item three", "Item four"]);
  const ih = Math.min(24, el.h / items.length);
  items.forEach((item, i) => {
    if (el.y + i * ih + ih > el.y + el.h) return;
    sketchLine(s, el.x + 8, el.y + i * ih + ih / 2, el.x + 12, el.y + i * ih + ih / 2, {
      stroke: "#777",
      lw: 2
    });
    sketchText(s, item, el.x + 20, el.y + i * ih + ih / 2, { base: "middle", size: 13 });
  });
});
r("breadcrumb", (s, el, st) => {
  const crumbs = (el.label || "Home / Products / Detail").split("/").map((x) => x.trim());
  let bx = el.x + 4;
  crumbs.forEach((c, i) => {
    const tw = s.measureText(c, { size: 13 }).width + 2;
    sketchText(s, c, bx, el.y + el.h / 2, {
      base: "middle",
      size: 13,
      color: i === crumbs.length - 1 ? "#333" : "#4a90d9"
    });
    bx += tw + 4;
    if (i < crumbs.length - 1) {
      sketchText(s, "/", bx, el.y + el.h / 2, { base: "middle", size: 13, color: "#aaa" });
      bx += 14;
    }
  });
  if (st.selected || st.hovered) selDash(s, el, st);
});
r("tabs", (s, el, st) => {
  const tabs = pipeListAttr(el, "tabNames", ["Tab 1", "Tab 2", "Tab 3"]);
  const activeIdx = clamp(numAttr(el, "active", 0), 0, tabs.length - 1);
  const tw = el.w / tabs.length;
  tabs.forEach((t, i) => {
    const active = i === activeIdx;
    sketchRect(s, el.x + i * tw, el.y, tw, 32, {
      fill: active ? "#fff" : "#f0f0f0",
      stroke: "#bbb",
      lw: 1.5
    });
    sketchText(s, t, el.x + i * tw + tw / 2, el.y + 16, {
      align: "center",
      base: "middle",
      size: 13,
      bold: active,
      color: active ? "#222" : "#888"
    });
  });
  sketchRect(s, el.x, el.y + 32, el.w, el.h - 32, { fill: "#fff", stroke: "#bbb" });
  sketchText(s, el.label || "Tab content", el.x + 10, el.y + 44, {
    size: 13,
    color: "#999",
    italic: true
  });
  if (st.selected) {
    s.rect(el.x - 2, el.y - 2, el.w + 4, el.h + 4, {
      stroke: PALETTE.selection,
      strokeWidth: 2
    });
  }
});
r("badge", (s, el) => {
  const bg = strAttr(el, "badgeColor", "#e94560");
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: "transparent", r: 0.5 });
  paintLabel(s, el, el.label || "Badge", {
    policy: "ellipsis",
    align: "center",
    baseline: "middle",
    size: 11,
    bold: true,
    color: "#fff",
    inset: 4
  });
});
r("progress", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#eee", stroke: strokeColor(st) });
  const pct = Math.max(0, Math.min(100, numAttr(el, "progress", 60)));
  sketchRect(s, el.x + 1, el.y + 1, (el.w - 2) * pct / 100, el.h - 2, {
    fill: "#4a90d9",
    stroke: "transparent",
    r: 0.3
  });
  sketchText(s, `${pct}%`, el.x + el.w / 2, el.y + el.h / 2, {
    align: "center",
    base: "middle",
    size: 11,
    bold: true,
    color: "#fff"
  });
});
r("avatar", (s, el, st) => {
  const r2 = Math.min(el.w, el.h) / 2;
  s.arc(s.jitter(el.x + r2, 0.5), s.jitter(el.y + r2, 0.5), r2, {
    fill: "#d0d0d0",
    stroke: strokeColor(st),
    strokeWidth: 2
  });
  s.arc(el.x + r2, el.y + r2 * 0.75, r2 * 0.3, { fill: "#aaa" });
  s.arcSegment(el.x + r2, el.y + r2 * 1.5, r2 * 0.5, 0, Math.PI, { fill: "#aaa" });
  if (el.label) sketchText(s, el.label, el.x + r2 * 2 + 6, el.y + r2, { base: "middle", size: 13 });
});
r("alert", (s, el) => {
  const ac = strAttr(el, "alertColor", "#4a90d9");
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: ac + "22", stroke: ac, lw: 2 });
  sketchText(s, "\u2139", el.x + 12, el.y + el.h / 2, { base: "middle", size: 16, color: ac });
  paintLabel(s, el, el.label || "Alert message here", {
    policy: "wrap",
    align: "left",
    baseline: el.h <= 32 ? "middle" : "top",
    size: 13,
    color: "#333",
    inset: 0,
    bbox: { x: el.x + 30, y: el.y + (el.h <= 32 ? 0 : 8), w: el.w - 38, h: el.h - 16 },
    lineH: 16
  });
});
r("modal", (s, el, st) => {
  s.rect(el.x + 6, el.y + 6, el.w, el.h, { fill: "rgba(0,0,0,0.25)" });
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st), lw: 2.5 });
  sketchRect(s, el.x, el.y, el.w, 36, { fill: "#f5f5f5", stroke: "transparent" });
  paintLabel(s, el, el.label || "Modal Title", {
    policy: "ellipsis",
    align: "left",
    baseline: "middle",
    bold: true,
    size: 14,
    color: "#222",
    inset: 12,
    bbox: { x: el.x, y: el.y, w: el.w - 36, h: 36 }
  });
  sketchText(s, "\u2715", el.x + el.w - 18, el.y + 18, {
    base: "middle",
    align: "right",
    size: 14,
    color: "#999"
  });
  sketchLine(s, el.x, el.y + 36, el.x + el.w, el.y + 36, { stroke: "#e0e0e0" });
});
r("pagination", (s, el) => {
  const total = Math.max(1, numAttr(el, "total", 10));
  const current = clamp(numAttr(el, "current", 2), 1, total);
  const pages = paginationLabels(current, total);
  const pw = el.w / pages.length;
  pages.forEach((p, i) => {
    const active = p === String(current);
    sketchRect(s, el.x + i * pw + 1, el.y + 1, pw - 2, el.h - 2, {
      fill: active ? "#4a90d9" : "#fff",
      stroke: "#ccc"
    });
    sketchText(s, p, el.x + i * pw + pw / 2, el.y + el.h / 2, {
      align: "center",
      base: "middle",
      size: 13,
      bold: active,
      color: active ? "#fff" : "#555"
    });
  });
});
function paginationLabels(current, total) {
  const out = ["\u2039"];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) out.push(String(i));
  } else {
    out.push("1");
    if (current > 3) out.push("\u2026");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) out.push(String(i));
    if (current < total - 2) out.push("\u2026");
    out.push(String(total));
  }
  out.push("\u203A");
  return out;
}
r("switch", (s, el, st) => {
  const on = boolAttr(el, "on", false);
  const pillH = Math.min(el.h, 28);
  const pillW = Math.min(el.w, pillH * 1.85);
  const px = el.x;
  const py = el.y + (el.h - pillH) / 2;
  sketchRect(s, px, py, pillW, pillH, {
    fill: on ? "#22c55e" : "#d4d4d8",
    stroke: on ? "#16a34a" : "#a1a1aa",
    lw: 1.5,
    r: 0.6
  });
  const knobR = pillH / 2 - 3;
  const knobCx = on ? px + pillW - knobR - 3 : px + knobR + 3;
  s.arc(s.jitter(knobCx, 0.4), s.jitter(py + pillH / 2, 0.4), knobR, {
    fill: "#fff",
    stroke: "#888",
    strokeWidth: 1
  });
  if (el.label) {
    sketchText(s, el.label, px + pillW + 10, el.y + el.h / 2, { base: "middle", size: 13 });
  }
});
r("slider", (s, el, st) => {
  const min = numAttr(el, "min", 0);
  const max = numAttr(el, "max", 100);
  const value = clamp(numAttr(el, "value", (min + max) / 2), min, max);
  const pct = max === min ? 0 : (value - min) / (max - min);
  const trackY = el.y + el.h / 2;
  s.rect(el.x, trackY - 2, el.w, 4, { fill: "#e4e4e7" });
  s.rect(el.x, trackY - 2, el.w * pct, 4, { fill: "#3b82c4" });
  const thumbCx = el.x + el.w * pct;
  s.arc(s.jitter(thumbCx, 0.4), s.jitter(trackY, 0.4), 8, {
    fill: "#fff",
    stroke: strokeColor(st),
    strokeWidth: 2
  });
});
r("search", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "rgba(255,255,255,.97)",
    stroke: strokeColor(st),
    lw: 1.5
  });
  const cx = el.x + 12;
  const cy = el.y + el.h / 2;
  s.arc(cx, cy, 5, { stroke: "#888", strokeWidth: 1.5 });
  s.line(cx + 4, cy + 4, cx + 8, cy + 8, { stroke: "#888", strokeWidth: 1.5 });
  paintLabel(s, el, el.label || "Search\u2026", {
    policy: "ellipsis",
    align: "left",
    baseline: "middle",
    italic: !el.attrs.value,
    size: 13,
    color: el.attrs.value ? "#222" : "#aaa",
    bbox: { x: el.x + 28, y: el.y, w: el.w - 36, h: el.h }
  });
});
r("chip", (s, el, st) => {
  const bg = strAttr(el, "chipColor", "#e4e4e7");
  const closable = boolAttr(el, "closable", false);
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: "#a1a1aa", lw: 1, r: 0.6 });
  const textRight = closable ? el.w - 16 : el.w - 8;
  paintLabel(s, el, el.label || "Chip", {
    policy: "ellipsis",
    align: "left",
    baseline: "middle",
    size: 12,
    color: "#3f3f46",
    bbox: { x: el.x + 8, y: el.y, w: textRight - 8, h: el.h }
  });
  if (closable) {
    const xCx = el.x + el.w - 10;
    const xCy = el.y + el.h / 2;
    s.line(xCx - 3, xCy - 3, xCx + 3, xCy + 3, { stroke: "#666", strokeWidth: 1.2 });
    s.line(xCx + 3, xCy - 3, xCx - 3, xCy + 3, { stroke: "#666", strokeWidth: 1.2 });
  }
});
r("segmented-control", (s, el, st) => {
  const items = pipeListAttr(el, "items", ["Day", "Week", "Month"]);
  const activeIdx = clamp(numAttr(el, "active", 0), 0, items.length - 1);
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#f4f4f5", stroke: "#d4d4d8", lw: 1, r: 0.5 });
  const segW = (el.w - 4) / items.length;
  items.forEach((label, i) => {
    const sx = el.x + 2 + i * segW;
    const sy = el.y + 2;
    if (i === activeIdx) {
      sketchRect(s, sx, sy, segW, el.h - 4, { fill: "#fff", stroke: "#bbb", lw: 1, r: 0.4 });
    }
    sketchText(s, label, sx + segW / 2, el.y + el.h / 2, {
      align: "center",
      base: "middle",
      size: 12,
      bold: i === activeIdx,
      color: i === activeIdx ? "#222" : "#666"
    });
  });
});
r("sidebar", (s, el, st) => {
  const collapsed = boolAttr(el, "collapsed", false);
  const items = pipeListAttr(el, "items", ["Home", "Inbox", "Settings"]);
  const activeIdx = clamp(numAttr(el, "active", 0), -1, items.length - 1);
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#f8f8fb", stroke: strokeColor(st), lw: 1 });
  if (el.label) {
    sketchText(s, el.label, el.x + 12, el.y + 14, { size: 14, bold: true, color: "#222" });
  }
  const startY = el.label ? el.y + 38 : el.y + 12;
  const rowH = 32;
  items.forEach((label, i) => {
    const ry = startY + i * rowH;
    if (ry + rowH > el.y + el.h) return;
    if (i === activeIdx) {
      s.rect(el.x + 6, ry, el.w - 12, rowH - 4, { fill: "#e0eefc" });
    }
    s.arc(el.x + 16, ry + (rowH - 4) / 2, 4, { fill: i === activeIdx ? "#3b82c4" : "#a1a1aa" });
    if (!collapsed) {
      sketchText(s, label, el.x + 30, ry + (rowH - 4) / 2, {
        base: "middle",
        size: 13,
        bold: i === activeIdx,
        color: i === activeIdx ? "#1a5590" : "#444"
      });
    }
  });
});
r("dropdown-menu", (s, el, st) => {
  const items = pipeListAttr(el, "items", ["Edit", "Duplicate", "---", "Delete"]);
  s.rect(el.x + 3, el.y + 3, el.w, el.h, { fill: "rgba(0,0,0,0.12)" });
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st), lw: 1.5 });
  const rowH = 28;
  let y = el.y + 6;
  for (const item of items) {
    if (y + rowH > el.y + el.h) break;
    if (item === "---") {
      sketchLine(s, el.x + 8, y + rowH / 2, el.x + el.w - 8, y + rowH / 2, { stroke: "#e4e4e7" });
    } else {
      sketchText(s, item, el.x + 12, y + rowH / 2, {
        base: "middle",
        size: 13,
        color: item.toLowerCase() === "delete" ? "#dc2626" : "#222"
      });
    }
    y += rowH;
  }
});
r("tooltip", (s, el) => {
  const arrow2 = strAttr(el, "arrow", "top");
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#1f2937", stroke: "#0f172a", lw: 1, r: 0.4 });
  paintLabel(s, el, el.label || "Tooltip", {
    policy: "ellipsis",
    align: "center",
    baseline: "middle",
    size: 12,
    color: "#fff",
    inset: 6
  });
  const sz = 6;
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  let pts;
  if (arrow2 === "bottom") pts = `M ${cx - sz} ${el.y + el.h} L ${cx + sz} ${el.y + el.h} L ${cx} ${el.y + el.h + sz} Z`;
  else if (arrow2 === "left") pts = `M ${el.x} ${cy - sz} L ${el.x} ${cy + sz} L ${el.x - sz} ${cy} Z`;
  else if (arrow2 === "right") pts = `M ${el.x + el.w} ${cy - sz} L ${el.x + el.w} ${cy + sz} L ${el.x + el.w + sz} ${cy} Z`;
  else pts = `M ${cx - sz} ${el.y} L ${cx + sz} ${el.y} L ${cx} ${el.y - sz} Z`;
  s.path(pts, { fill: "#1f2937", stroke: "#0f172a" });
});
r("toast", (s, el) => {
  const variant = strAttr(el, "variant", "info");
  const colors = {
    info: { bg: "#1f2937", ic: "#60a5fa" },
    success: { bg: "#14532d", ic: "#22c55e" },
    warn: { bg: "#78350f", ic: "#f59e0b" },
    error: { bg: "#7f1d1d", ic: "#ef4444" }
  };
  const c = colors[variant] ?? colors.info;
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: c.bg, stroke: "#0f172a", lw: 1, r: 0.5 });
  s.arc(el.x + 16, el.y + el.h / 2, 6, { fill: c.ic });
  paintLabel(s, el, el.label || "Toast notification", {
    policy: "ellipsis",
    align: "left",
    baseline: "middle",
    size: 13,
    color: "#fff",
    bbox: { x: el.x + 32, y: el.y, w: el.w - 40, h: el.h }
  });
});
r("spinner", (s, el) => {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const r2 = Math.min(el.w, el.h) / 2 - 2;
  s.arcSegment(cx, cy, r2, Math.PI / 2, Math.PI * 2, {
    stroke: strokeColor({ selected: false, hovered: false }),
    strokeWidth: 3,
    fill: "transparent"
  });
});
r("skeleton", (s, el) => {
  const lines = clamp(numAttr(el, "lines", 3), 1, 12);
  const lineH = Math.max(8, Math.min(16, (el.h - (lines - 1) * 6) / lines));
  for (let i = 0; i < lines; i++) {
    const ly = el.y + i * (lineH + 6);
    if (ly + lineH > el.y + el.h) break;
    const lw = i === lines - 1 ? el.w * 0.65 : el.w;
    s.rect(el.x, ly, lw, lineH, { fill: "#e4e4e7" });
  }
});
r("code-block", (s, el) => {
  const lang = strAttr(el, "lang", "");
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#1e1e2e", stroke: "#3f3f46", lw: 1.5, r: 0.4 });
  if (lang) {
    s.rect(el.x + el.w - 70, el.y + 6, 60, 20, { fill: "#3f3f46", stroke: "transparent" });
    sketchText(s, lang, el.x + el.w - 40, el.y + 16, {
      align: "center",
      base: "middle",
      size: 11,
      color: "#a1a1aa",
      font: "ui-monospace, monospace"
    });
  }
  const lineCount = Math.max(1, Math.floor((el.h - 24) / 16));
  const text = el.label || "function example() {\n  return true\n}";
  const lines = text.split("\n").slice(0, lineCount);
  lines.forEach((line, i) => {
    sketchText(s, line, el.x + 12, el.y + 20 + i * 16, {
      size: 12,
      color: "#a5d6ff",
      font: "ui-monospace, monospace"
    });
  });
});
r("accordion", (s, el, st) => {
  const expanded = boolAttr(el, "expanded", false);
  const headerH = Math.min(40, el.h);
  sketchRect(s, el.x, el.y, el.w, headerH, { fill: "#f4f4f5", stroke: strokeColor(st), lw: 1 });
  paintLabel(s, el, el.label || "Section title", {
    policy: "ellipsis",
    align: "left",
    baseline: "middle",
    bold: true,
    size: 13,
    color: "#222",
    inset: 12,
    bbox: { x: el.x, y: el.y, w: el.w - 28, h: headerH }
  });
  const chx = el.x + el.w - 16;
  const chy = el.y + headerH / 2;
  if (expanded) {
    s.path(`M ${chx - 5} ${chy - 3} L ${chx} ${chy + 3} L ${chx + 5} ${chy - 3}`, {
      stroke: "#444",
      strokeWidth: 1.5,
      fill: "transparent"
    });
  } else {
    s.path(`M ${chx - 3} ${chy - 5} L ${chx + 3} ${chy} L ${chx - 3} ${chy + 5}`, {
      stroke: "#444",
      strokeWidth: 1.5,
      fill: "transparent"
    });
  }
  if (expanded && el.h > headerH) {
    sketchRect(s, el.x, el.y + headerH, el.w, el.h - headerH, {
      fill: "#fff",
      stroke: strokeColor(st),
      lw: 1
    });
    sketchText(s, "Section content\u2026", el.x + 12, el.y + headerH + 16, {
      size: 12,
      color: "#666",
      italic: true
    });
  }
});
r("chat-bubble", (s, el) => {
  const side = strAttr(el, "side", "left");
  const bg = strAttr(el, "bubbleColor", side === "left" ? "#f4f4f5" : "#3b82c4");
  const fg = strAttr(el, "textColor", side === "left" ? "#222" : "#fff");
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: side === "left" ? "#d4d4d8" : "#1a5590", lw: 1.5, r: 0.6 });
  if (side === "left") {
    s.path(`M ${el.x + 8} ${el.y + el.h} L ${el.x} ${el.y + el.h + 8} L ${el.x + 18} ${el.y + el.h} Z`, {
      fill: bg,
      stroke: "#d4d4d8"
    });
  } else {
    s.path(
      `M ${el.x + el.w - 8} ${el.y + el.h} L ${el.x + el.w} ${el.y + el.h + 8} L ${el.x + el.w - 18} ${el.y + el.h} Z`,
      { fill: bg, stroke: "#1a5590" }
    );
  }
  wrapText(s, el.label || "Message", el.x + 10, el.y + 8, el.w - 20, 16, 99, {
    size: 13,
    color: fg
  });
});
r("chart-bar", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st), lw: 1 });
  const data = numListAttr(el, "data", [3, 5, 2, 7, 4, 6, 3]);
  const maxV = Math.max(1, ...data);
  const padding = 12;
  const innerW = el.w - padding * 2;
  const innerH = el.h - padding * 2;
  const barGap = 4;
  const barW = (innerW - barGap * (data.length - 1)) / data.length;
  data.forEach((v, i) => {
    const h = v / maxV * innerH;
    const bx = el.x + padding + i * (barW + barGap);
    const by = el.y + el.h - padding - h;
    sketchRect(s, bx, by, barW, h, { fill: "#3b82c4", stroke: "#1a5590", lw: 1 });
  });
});
r("chart-line", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st), lw: 1 });
  const data = numListAttr(el, "data", [3, 5, 2, 7, 4, 8, 6]);
  const maxV = Math.max(1, ...data);
  const padding = 12;
  const innerW = el.w - padding * 2;
  const innerH = el.h - padding * 2;
  const stepX = innerW / Math.max(1, data.length - 1);
  let d = "";
  data.forEach((v, i) => {
    const px = el.x + padding + i * stepX;
    const py = el.y + el.h - padding - v / maxV * innerH;
    d += `${i === 0 ? "M" : " L"} ${s.jitter(px, 1.5)} ${s.jitter(py, 1.5)}`;
  });
  s.path(d, { stroke: "#3b82c4", strokeWidth: 2, fill: "transparent" });
  data.forEach((v, i) => {
    const px = el.x + padding + i * stepX;
    const py = el.y + el.h - padding - v / maxV * innerH;
    s.arc(px, py, 3, { fill: "#fff", stroke: "#3b82c4", strokeWidth: 1.5 });
  });
});
r("chart-donut", (s, el, st) => {
  const data = numListAttr(el, "data", [40, 30, 20, 10]);
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const r2 = Math.min(el.w, el.h) / 2 - 6;
  const palette = ["#3b82c4", "#22c55e", "#f59e0b", "#dc2626", "#8b5cf6", "#06b6d4"];
  let start = -Math.PI / 2;
  data.forEach((v, i) => {
    const angle = v / total * Math.PI * 2;
    const end = start + angle;
    const x1 = cx + r2 * Math.cos(start);
    const y1 = cy + r2 * Math.sin(start);
    const x2 = cx + r2 * Math.cos(end);
    const y2 = cy + r2 * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    s.path(`M ${cx} ${cy} L ${x1} ${y1} A ${r2} ${r2} 0 ${large} 1 ${x2} ${y2} Z`, {
      fill: palette[i % palette.length],
      stroke: "#fff",
      strokeWidth: 1.5
    });
    start = end;
  });
  s.arc(cx, cy, r2 * 0.55, { fill: "#fff", stroke: strokeColor(st), strokeWidth: 1 });
});
r("calendar", (s, el, st) => {
  const month = clamp(numAttr(el, "month", 1), 1, 12);
  const year = numAttr(el, "year", 2026);
  const selected = numAttr(el, "selected", -1);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st), lw: 1 });
  const headerH = 28;
  sketchText(s, `${monthNames[month - 1]} ${year}`, el.x + el.w / 2, el.y + headerH / 2, {
    align: "center",
    base: "middle",
    size: 13,
    bold: true
  });
  const weekdayY = el.y + headerH + 8;
  const cellW = el.w / 7;
  weekdays.forEach((d, i) => {
    sketchText(s, d, el.x + i * cellW + cellW / 2, weekdayY, {
      align: "center",
      base: "middle",
      size: 10,
      color: "#888",
      bold: true
    });
  });
  const gridY = weekdayY + 14;
  const cellH = (el.y + el.h - gridY - 4) / 6;
  for (let day = 1; day <= daysInMonth; day++) {
    const cellIdx = firstWeekday + day - 1;
    const row = Math.floor(cellIdx / 7);
    const col = cellIdx % 7;
    if (row > 5) break;
    const px = el.x + col * cellW + cellW / 2;
    const py = gridY + row * cellH + cellH / 2;
    if (day === selected) {
      s.arc(px, py, Math.min(cellW, cellH) / 2 - 2, { fill: "#3b82c4" });
    }
    sketchText(s, String(day), px, py, {
      align: "center",
      base: "middle",
      size: 11,
      color: day === selected ? "#fff" : "#222",
      bold: day === selected
    });
  }
});
r("phone-frame", (s, el) => {
  const model = strAttr(el, "model", "iphone");
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#1f2937", stroke: "#0f172a", lw: 2.5 });
  const inset = 8;
  sketchRect(s, el.x + inset, el.y + inset, el.w - inset * 2, el.h - inset * 2, {
    fill: "#fff",
    stroke: "#0f172a",
    lw: 1
  });
  if (model !== "android") {
    const notchW = el.w * 0.32;
    const notchH = 18;
    s.rect(el.x + (el.w - notchW) / 2, el.y + inset + 4, notchW, notchH, { fill: "#0f172a" });
  }
  s.rect(el.x + el.w, el.y + el.h * 0.18, 3, el.h * 0.06, { fill: "#0f172a" });
  s.rect(el.x + el.w, el.y + el.h * 0.28, 3, el.h * 0.1, { fill: "#0f172a" });
});
r("status-bar", (s, el) => {
  s.rect(el.x, el.y, el.w, el.h, { fill: el.attrs.bg ? String(el.attrs.bg) : "transparent" });
  sketchText(s, el.label || "9:41", el.x + 14, el.y + el.h / 2, {
    base: "middle",
    size: 12,
    bold: true,
    color: "#222"
  });
  const right = el.x + el.w - 12;
  s.rect(right - 24, el.y + el.h / 2 - 6, 22, 12, { stroke: "#222", strokeWidth: 1 });
  s.rect(right - 22, el.y + el.h / 2 - 4, 12, 8, { fill: "#222" });
  s.rect(right - 2, el.y + el.h / 2 - 3, 2, 6, { fill: "#222" });
  for (let i = 0; i < 3; i++) {
    s.arcSegment(right - 38, el.y + el.h / 2 + 4, 3 + i * 3, Math.PI + 0.2, -0.2, {
      stroke: "#222",
      strokeWidth: 1,
      fill: "transparent"
    });
  }
  for (let i = 0; i < 4; i++) {
    const bh = 3 + i * 2;
    s.rect(right - 60 + i * 3, el.y + el.h / 2 + 4 - bh, 2, bh, { fill: "#222" });
  }
});
r("home-indicator", (s, el) => {
  const w = Math.min(el.w * 0.32, 140);
  const h = Math.min(el.h, 5);
  s.rect(el.x + (el.w - w) / 2, el.y + (el.h - h) / 2, w, h, { fill: "#222" });
});
r("fab", (s, el, st) => {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const r2 = Math.min(el.w, el.h) / 2 - 2;
  s.arc(cx + 2, cy + 3, r2, { fill: "rgba(0,0,0,0.18)" });
  s.arc(s.jitter(cx, 0.4), s.jitter(cy, 0.4), r2, {
    fill: "#3b82c4",
    stroke: st.selected ? PALETTE.selection : "#1a5590",
    strokeWidth: 2
  });
  const glyph = el.label || strAttr(el, "glyph", "+");
  sketchText(s, glyph, cx, cy, {
    align: "center",
    base: "middle",
    size: r2 * 0.9,
    bold: true,
    color: "#fff"
  });
});
r("app-icon", (s, el) => {
  const bg = strAttr(el, "bg", "#3b82c4");
  const glyph = strAttr(el, "glyph", el.label || "A");
  const badge = numAttr(el, "badge", 0);
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: "transparent", r: 1 });
  sketchText(s, glyph, el.x + el.w / 2, el.y + el.h / 2, {
    align: "center",
    base: "middle",
    size: el.h * 0.45,
    bold: true,
    color: "#fff"
  });
  if (badge > 0) {
    const br = Math.min(el.w, el.h) * 0.18;
    const bcx = el.x + el.w - br + 2;
    const bcy = el.y + br - 2;
    s.arc(bcx, bcy, br, { fill: "#dc2626", stroke: "#fff", strokeWidth: 1.5 });
    sketchText(s, String(badge), bcx, bcy, {
      align: "center",
      base: "middle",
      size: br * 1.1,
      bold: true,
      color: "#fff"
    });
  }
});
r("window-frame", (s, el) => {
  const titleH = 28;
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: "#0f172a", lw: 2, r: 0.5 });
  sketchRect(s, el.x, el.y, el.w, titleH, { fill: "#e8e8ee", stroke: "#0f172a", lw: 1 });
  s.arc(el.x + 12, el.y + titleH / 2, 6, { fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1 });
  s.arc(el.x + 28, el.y + titleH / 2, 6, { fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1 });
  s.arc(el.x + 44, el.y + titleH / 2, 6, { fill: "#22c55e", stroke: "#15803d", strokeWidth: 1 });
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + titleH / 2, {
      align: "center",
      base: "middle",
      size: 12,
      bold: true,
      color: "#444"
    });
  }
});
r("browser-frame", (s, el) => {
  const tabH = 30;
  const urlH = 36;
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: "#0f172a", lw: 1.5, r: 0.4 });
  sketchRect(s, el.x, el.y, el.w, tabH, { fill: "#e2e8f0", stroke: "transparent" });
  const tabsAttr = strAttr(el, "tabs", "Boceto \xB7 Wireframes that fit in markdown");
  const tabLabels = tabsAttr.split("|").map((t) => t.trim());
  let tx = el.x + 6;
  tabLabels.forEach((tabLabel, i) => {
    const tw = Math.min(220, s.measureText(tabLabel, { size: 11 }).width + 36);
    if (i === 0) {
      sketchRect(s, tx, el.y + 4, tw, tabH - 4, { fill: "#fff", stroke: "#cbd5e1", lw: 1, r: 0.5 });
    }
    sketchText(s, tabLabel, tx + 12, el.y + tabH / 2, {
      base: "middle",
      size: 11,
      color: i === 0 ? "#222" : "#666",
      bold: i === 0
    });
    if (i === 0) {
      const cx = tx + tw - 10;
      const cy = el.y + tabH / 2;
      s.line(cx - 3, cy - 3, cx + 3, cy + 3, { stroke: "#999", strokeWidth: 1 });
      s.line(cx + 3, cy - 3, cx - 3, cy + 3, { stroke: "#999", strokeWidth: 1 });
    }
    tx += tw + 4;
  });
  sketchRect(s, el.x, el.y + tabH, el.w, urlH, { fill: "#f1f5f9", stroke: "transparent" });
  s.path(`M ${el.x + 16} ${el.y + tabH + urlH / 2} L ${el.x + 22} ${el.y + tabH + urlH / 2 - 5} M ${el.x + 16} ${el.y + tabH + urlH / 2} L ${el.x + 22} ${el.y + tabH + urlH / 2 + 5}`, { stroke: "#666", strokeWidth: 1.5, fill: "transparent" });
  s.path(`M ${el.x + 36} ${el.y + tabH + urlH / 2 - 5} L ${el.x + 30} ${el.y + tabH + urlH / 2} L ${el.x + 36} ${el.y + tabH + urlH / 2 + 5}`, { stroke: "#bbb", strokeWidth: 1.5, fill: "transparent" });
  s.arcSegment(el.x + 50, el.y + tabH + urlH / 2, 6, 0.5, Math.PI * 1.7, { stroke: "#666", strokeWidth: 1.5, fill: "transparent" });
  const urlW = el.w - 80;
  sketchRect(s, el.x + 70, el.y + tabH + 6, urlW, urlH - 12, { fill: "#fff", stroke: "#cbd5e1", lw: 1, r: 0.4 });
  const urlText = el.label || "https://boceto.dev";
  sketchText(s, "\u{1F512} " + urlText, el.x + 80, el.y + tabH + urlH / 2, {
    base: "middle",
    size: 12,
    color: "#444",
    font: "ui-monospace, monospace"
  });
});
r("terminal", (s, el) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#0f172a", stroke: "#020617", lw: 1.5, r: 0.4 });
  let bodyY = el.y + 8;
  if (el.h > 100) {
    s.rect(el.x, el.y, el.w, 22, { fill: "#1e293b" });
    s.arc(el.x + 12, el.y + 11, 4, { fill: "#ef4444" });
    s.arc(el.x + 26, el.y + 11, 4, { fill: "#f59e0b" });
    s.arc(el.x + 40, el.y + 11, 4, { fill: "#22c55e" });
    bodyY = el.y + 28;
  }
  const text = el.label || "$ pnpm test\n\u2713 156 passed\n$ ";
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const ly = bodyY + 6 + i * 16;
    if (ly + 16 > el.y + el.h) return;
    sketchText(s, line, el.x + 12, ly, {
      size: 12,
      color: line.startsWith("$") ? "#a5d6ff" : line.startsWith("\u2713") ? "#86efac" : "#e2e8f0",
      font: "ui-monospace, monospace"
    });
  });
  const lastLine = lines[lines.length - 1] ?? "";
  const cursorX = el.x + 12 + s.measureText(lastLine, { size: 12, font: "ui-monospace, monospace" }).width + 2;
  const cursorY = bodyY + 6 + (lines.length - 1) * 16;
  if (cursorY + 14 <= el.y + el.h) {
    s.rect(cursorX, cursorY, 8, 14, { fill: "#a5d6ff" });
  }
});
r("combobox", (s, el, st) => {
  const inputH = Math.min(36, el.h);
  sketchRect(s, el.x, el.y, el.w, inputH, {
    fill: "rgba(255,255,255,.97)",
    stroke: strokeColor(st),
    lw: 1.5
  });
  sketchText(s, el.label || "Type to search\u2026", el.x + 8, el.y + inputH / 2, {
    base: "middle",
    size: 13,
    color: "#aaa",
    italic: true
  });
  s.path(
    `M ${el.x + el.w - 18} ${el.y + inputH / 2 - 3} L ${el.x + el.w - 10} ${el.y + inputH / 2 + 4} L ${el.x + el.w - 2} ${el.y + inputH / 2 - 3}`,
    { stroke: "#777", strokeWidth: 1.5, fill: "transparent" }
  );
  if (el.h > inputH + 20) {
    const items = pipeListAttr(el, "items", ["Apple", "Banana", "Cherry"]);
    sketchRect(s, el.x, el.y + inputH + 2, el.w, el.h - inputH - 2, {
      fill: "#fff",
      stroke: "#cbd5e1",
      lw: 1
    });
    const rowH = 28;
    items.forEach((label, i) => {
      const ry = el.y + inputH + 6 + i * rowH;
      if (ry + rowH > el.y + el.h) return;
      if (i === 0) s.rect(el.x + 4, ry, el.w - 8, rowH - 4, { fill: "#e0eefc" });
      sketchText(s, label, el.x + 12, ry + (rowH - 4) / 2, {
        base: "middle",
        size: 13,
        color: "#222"
      });
    });
  }
});
r("date-picker", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "rgba(255,255,255,.97)",
    stroke: strokeColor(st),
    lw: 1.5
  });
  sketchText(s, el.label || "2026-03-15", el.x + 12, el.y + el.h / 2, {
    base: "middle",
    size: 13,
    color: "#222"
  });
  const cx = el.x + el.w - 16;
  const cy = el.y + el.h / 2;
  s.rect(cx - 7, cy - 7, 14, 13, { stroke: "#666", strokeWidth: 1.2, fill: "transparent" });
  s.line(cx - 7, cy - 3, cx + 7, cy - 3, { stroke: "#666", strokeWidth: 1 });
  s.rect(cx - 5, cy - 9, 2, 4, { fill: "#666" });
  s.rect(cx + 3, cy - 9, 2, 4, { fill: "#666" });
});
r("color-picker", (s, el, st) => {
  const swatchSize = el.h - 4;
  const color = strAttr(el, "color", el.label || "#3b82c4");
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "rgba(255,255,255,.97)",
    stroke: strokeColor(st),
    lw: 1.5
  });
  s.rect(el.x + 4, el.y + 2, swatchSize, swatchSize, { fill: color, stroke: "#888", strokeWidth: 1 });
  sketchText(s, color, el.x + swatchSize + 14, el.y + el.h / 2, {
    base: "middle",
    size: 13,
    color: "#222",
    font: "ui-monospace, monospace"
  });
});
r("file-upload", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "#f8fafc",
    stroke: strokeColor(st),
    lw: 1.5
  });
  s.rect(el.x + 6, el.y + 6, el.w - 12, el.h - 12, {
    fill: "transparent",
    stroke: "#94a3b8",
    strokeWidth: 1.5
  });
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2 - 8;
  s.arc(cx - 8, cy + 2, 8, { fill: "#cbd5e1" });
  s.arc(cx + 4, cy - 2, 10, { fill: "#cbd5e1" });
  s.arc(cx + 14, cy + 4, 7, { fill: "#cbd5e1" });
  s.rect(cx - 16, cy + 4, 36, 8, { fill: "#cbd5e1" });
  s.path(`M ${cx} ${cy + 12} L ${cx} ${cy + 2} M ${cx - 4} ${cy + 6} L ${cx} ${cy + 2} L ${cx + 4} ${cy + 6}`, {
    stroke: "#fff",
    strokeWidth: 2,
    fill: "transparent"
  });
  sketchText(s, el.label || "Drag & drop files here", el.x + el.w / 2, el.y + el.h - 16, {
    align: "center",
    base: "middle",
    size: 12,
    color: "#666"
  });
});
r("rating", (s, el) => {
  const max = clamp(numAttr(el, "max", 5), 1, 10);
  const value = clamp(numAttr(el, "value", 4), 0, max);
  const starGap = 4;
  const starSize = Math.min(el.h, (el.w - (max - 1) * starGap) / max);
  for (let i = 0; i < max; i++) {
    const cx = el.x + i * (starSize + starGap) + starSize / 2;
    const cy = el.y + el.h / 2;
    const filled = i < Math.floor(value);
    drawStar(s, cx, cy, starSize / 2, {
      fill: filled ? "#f59e0b" : "#fff",
      stroke: filled ? "#b45309" : "#94a3b8",
      strokeWidth: 1.2
    });
  }
});
r("otp-input", (s, el, st) => {
  const count = clamp(numAttr(el, "count", 6), 1, 10);
  const value = strAttr(el, "value", el.label || "12");
  const gap = 6;
  const boxSize = Math.min(el.h, (el.w - (count - 1) * gap) / count);
  for (let i = 0; i < count; i++) {
    const bx = el.x + i * (boxSize + gap);
    const filled = i < value.length;
    sketchRect(s, bx, el.y + (el.h - boxSize) / 2, boxSize, boxSize, {
      fill: "#fff",
      stroke: filled ? PALETTE.selection : strokeColor(st),
      lw: filled ? 2 : 1.2
    });
    if (filled) {
      sketchText(s, value[i] ?? "", bx + boxSize / 2, el.y + el.h / 2, {
        align: "center",
        base: "middle",
        size: boxSize * 0.55,
        bold: true,
        color: "#222",
        font: "ui-monospace, monospace"
      });
    }
  }
});
r("tag-input", (s, el, st) => {
  const tags = pipeListAttr(el, "tags", ["design", "wireframe"]);
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "rgba(255,255,255,.97)",
    stroke: strokeColor(st),
    lw: 1.5
  });
  let cx = el.x + 8;
  const cy = el.y + el.h / 2;
  for (const tag of tags) {
    const tw = s.measureText(tag, { size: 11 }).width + 22;
    if (cx + tw > el.x + el.w - 60) break;
    sketchRect(s, cx, cy - 10, tw, 20, { fill: "#e0eefc", stroke: "#3b82c4", lw: 1, r: 0.4 });
    sketchText(s, tag, cx + 6, cy, { base: "middle", size: 11, color: "#1a5590" });
    const xCx = cx + tw - 8;
    s.line(xCx - 2, cy - 2, xCx + 2, cy + 2, { stroke: "#1a5590", strokeWidth: 1 });
    s.line(xCx + 2, cy - 2, xCx - 2, cy + 2, { stroke: "#1a5590", strokeWidth: 1 });
    cx += tw + 4;
  }
  sketchText(s, "Add tag\u2026", cx + 4, cy, { base: "middle", size: 12, color: "#aaa", italic: true });
});
r("stepper-input", (s, el, st) => {
  const buttonW = el.h;
  sketchRect(s, el.x, el.y, buttonW, el.h, {
    fill: "#f1f5f9",
    stroke: strokeColor(st),
    lw: 1.2
  });
  s.line(el.x + buttonW / 2 - 6, el.y + el.h / 2, el.x + buttonW / 2 + 6, el.y + el.h / 2, {
    stroke: "#222",
    strokeWidth: 2
  });
  sketchRect(s, el.x + buttonW, el.y, el.w - buttonW * 2, el.h, {
    fill: "#fff",
    stroke: strokeColor(st),
    lw: 1.2
  });
  const value = strAttr(el, "value", el.label || "12");
  sketchText(s, value, el.x + el.w / 2, el.y + el.h / 2, {
    align: "center",
    base: "middle",
    size: 14,
    bold: true,
    color: "#222"
  });
  sketchRect(s, el.x + el.w - buttonW, el.y, buttonW, el.h, {
    fill: "#f1f5f9",
    stroke: strokeColor(st),
    lw: 1.2
  });
  s.line(el.x + el.w - buttonW / 2 - 6, el.y + el.h / 2, el.x + el.w - buttonW / 2 + 6, el.y + el.h / 2, {
    stroke: "#222",
    strokeWidth: 2
  });
  s.line(el.x + el.w - buttonW / 2, el.y + el.h / 2 - 6, el.x + el.w - buttonW / 2, el.y + el.h / 2 + 6, {
    stroke: "#222",
    strokeWidth: 2
  });
});
r("range-slider", (s, el, st) => {
  const min = numAttr(el, "min", 0);
  const max = numAttr(el, "max", 100);
  const low = clamp(numAttr(el, "low", min + (max - min) * 0.3), min, max);
  const high = clamp(numAttr(el, "high", min + (max - min) * 0.7), low, max);
  const lowPct = max === min ? 0 : (low - min) / (max - min);
  const highPct = max === min ? 1 : (high - min) / (max - min);
  const trackY = el.y + el.h / 2;
  s.rect(el.x, trackY - 2, el.w, 4, { fill: "#e4e4e7" });
  s.rect(el.x + el.w * lowPct, trackY - 2, el.w * (highPct - lowPct), 4, { fill: "#3b82c4" });
  s.arc(s.jitter(el.x + el.w * lowPct, 0.4), s.jitter(trackY, 0.4), 8, {
    fill: "#fff",
    stroke: strokeColor(st),
    strokeWidth: 2
  });
  s.arc(s.jitter(el.x + el.w * highPct, 0.4), s.jitter(trackY, 0.4), 8, {
    fill: "#fff",
    stroke: strokeColor(st),
    strokeWidth: 2
  });
});
r("tree", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st), lw: 1 });
  const items = pipeListAttr(el, "items", [
    "src",
    "/components",
    "//Button.tsx",
    "//Card.tsx",
    "/utils",
    "//format.ts"
  ]);
  const rowH = 22;
  items.forEach((rawItem, i) => {
    const ry = el.y + 8 + i * rowH;
    if (ry + rowH > el.y + el.h) return;
    const depth = (rawItem.match(/^\/+/) ?? [""])[0].length;
    const label = rawItem.replace(/^\/+/, "");
    const indent = 8 + depth * 16;
    const isFile = label.includes(".");
    sketchText(s, isFile ? "\u25E6" : "\u25B8", el.x + indent, ry + rowH / 2, {
      base: "middle",
      size: 11,
      color: isFile ? "#94a3b8" : "#666"
    });
    sketchText(s, label, el.x + indent + 16, ry + rowH / 2, {
      base: "middle",
      size: 12,
      color: "#222"
    });
  });
});
r("stepper", (s, el) => {
  const items = pipeListAttr(el, "items", ["Account", "Profile", "Confirm", "Done"]);
  const current = clamp(numAttr(el, "current", 1), 0, items.length - 1);
  const stepGap = (el.w - 32 * items.length) / Math.max(1, items.length - 1);
  items.forEach((label, i) => {
    const cx = el.x + 16 + i * (32 + stepGap);
    const cy = el.y + 20;
    const done = i < current;
    const active = i === current;
    s.arc(cx, cy, 14, {
      fill: done ? "#22c55e" : active ? "#3b82c4" : "#fff",
      stroke: done ? "#15803d" : active ? "#1a5590" : "#94a3b8",
      strokeWidth: 1.5
    });
    sketchText(s, done ? "\u2713" : String(i + 1), cx, cy, {
      align: "center",
      base: "middle",
      size: 13,
      bold: true,
      color: done || active ? "#fff" : "#666"
    });
    sketchText(s, label, cx, cy + 26, {
      align: "center",
      base: "top",
      size: 11,
      bold: active,
      color: active ? "#222" : "#666"
    });
    if (i < items.length - 1) {
      sketchLine(s, cx + 16, cy, cx + 16 + stepGap, cy, {
        stroke: i < current ? "#22c55e" : "#cbd5e1",
        lw: 2
      });
    }
  });
});
r("carousel", (s, el, st) => {
  const dotsH = 18;
  sketchRect(s, el.x, el.y, el.w, el.h - dotsH, { fill: "#f1f5f9", stroke: strokeColor(st), lw: 1.5 });
  sketchLine(s, el.x + 8, el.y + 8, el.x + el.w - 8, el.y + el.h - dotsH - 8, { stroke: "#cbd5e1" });
  sketchLine(s, el.x + el.w - 8, el.y + 8, el.x + 8, el.y + el.h - dotsH - 8, { stroke: "#cbd5e1" });
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + (el.h - dotsH) / 2 + 16, {
      align: "center",
      base: "middle",
      size: 12,
      italic: true,
      color: "#666"
    });
  }
  const ay = el.y + (el.h - dotsH) / 2;
  s.arc(el.x + 14, ay, 12, { fill: "rgba(0,0,0,0.4)" });
  s.path(`M ${el.x + 18} ${ay - 5} L ${el.x + 12} ${ay} L ${el.x + 18} ${ay + 5}`, {
    stroke: "#fff",
    strokeWidth: 2,
    fill: "transparent"
  });
  s.arc(el.x + el.w - 14, ay, 12, { fill: "rgba(0,0,0,0.4)" });
  s.path(
    `M ${el.x + el.w - 18} ${ay - 5} L ${el.x + el.w - 12} ${ay} L ${el.x + el.w - 18} ${ay + 5}`,
    { stroke: "#fff", strokeWidth: 2, fill: "transparent" }
  );
  const total = clamp(numAttr(el, "total", 5), 1, 12);
  const active = clamp(numAttr(el, "active", 0), 0, total - 1);
  const dotGap = 12;
  const dotsW = total * 8 + (total - 1) * (dotGap - 8);
  let dx = el.x + (el.w - dotsW) / 2;
  for (let i = 0; i < total; i++) {
    s.arc(dx + 4, el.y + el.h - dotsH / 2, i === active ? 5 : 3, {
      fill: i === active ? "#222" : "#cbd5e1"
    });
    dx += dotGap;
  }
});
r("popover", (s, el, st) => {
  const arrow2 = strAttr(el, "arrow", "top");
  s.rect(el.x + 3, el.y + 3, el.w, el.h, { fill: "rgba(0,0,0,0.12)" });
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "#fff",
    stroke: strokeColor(st),
    lw: 1.5,
    r: 0.5
  });
  if (el.label) {
    sketchText(s, el.label, el.x + 12, el.y + 16, {
      base: "middle",
      size: 13,
      bold: true,
      color: "#222"
    });
    sketchLine(s, el.x + 8, el.y + 32, el.x + el.w - 8, el.y + 32, { stroke: "#e4e4e7" });
  }
  sketchText(s, "Popover content goes here.", el.x + 12, el.y + (el.label ? 48 : 20), {
    size: 12,
    color: "#666",
    italic: true
  });
  const sz = 8;
  let pts;
  if (arrow2 === "bottom") pts = `M ${el.x + el.w / 2 - sz} ${el.y + el.h} L ${el.x + el.w / 2 + sz} ${el.y + el.h} L ${el.x + el.w / 2} ${el.y + el.h + sz} Z`;
  else if (arrow2 === "left") pts = `M ${el.x} ${el.y + el.h / 2 - sz} L ${el.x} ${el.y + el.h / 2 + sz} L ${el.x - sz} ${el.y + el.h / 2} Z`;
  else if (arrow2 === "right") pts = `M ${el.x + el.w} ${el.y + el.h / 2 - sz} L ${el.x + el.w} ${el.y + el.h / 2 + sz} L ${el.x + el.w + sz} ${el.y + el.h / 2} Z`;
  else pts = `M ${el.x + el.w / 2 - sz} ${el.y} L ${el.x + el.w / 2 + sz} ${el.y} L ${el.x + el.w / 2} ${el.y - sz} Z`;
  s.path(pts, { fill: "#fff", stroke: strokeColor(st) });
});
r("kbd", (s, el) => {
  s.rect(el.x + 1, el.y + 2, el.w, el.h, { fill: "#94a3b8" });
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#f8fafc", stroke: "#475569", lw: 1.2, r: 0.4 });
  sketchText(s, el.label || "\u2318K", el.x + el.w / 2, el.y + el.h / 2, {
    align: "center",
    base: "middle",
    size: Math.min(13, el.h * 0.55),
    bold: true,
    color: "#222",
    font: "ui-monospace, monospace"
  });
});
r("quote", (s, el) => {
  s.rect(el.x, el.y, 4, el.h, { fill: "#94a3b8" });
  sketchText(s, '"', el.x + 12, el.y + 4, { size: 32, color: "#cbd5e1" });
  wrapText(s, el.label || "A short quote that wraps if needed.", el.x + 36, el.y + 16, el.w - 44, 18, 99, {
    size: 14,
    color: "#475569",
    italic: true
  });
});
r("status-dot", (s, el) => {
  const status = strAttr(el, "status", el.label || "online");
  const colors = {
    online: "#22c55e",
    away: "#f59e0b",
    offline: "#94a3b8",
    busy: "#dc2626"
  };
  const color = colors[status] ?? colors.online;
  const radius = Math.min(el.w, el.h) / 2 - 1;
  s.arc(el.x + el.w / 2, el.y + el.h / 2, radius, { fill: color, stroke: "#fff", strokeWidth: 1.5 });
});
r("notification-bell", (s, el) => {
  const count = numAttr(el, "count", 3);
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const bw = el.w * 0.55;
  const bh = el.h * 0.55;
  s.path(
    `M ${cx - bw / 2} ${cy + bh / 2 - 4} L ${cx - bw / 2} ${cy - bh / 4} A ${bw / 2} ${bw / 2} 0 0 1 ${cx + bw / 2} ${cy - bh / 4} L ${cx + bw / 2} ${cy + bh / 2 - 4} Z`,
    { fill: "#475569", stroke: "#1e293b", strokeWidth: 1.5 }
  );
  s.arc(cx, cy + bh / 2 + 2, 3, { fill: "#475569" });
  s.rect(cx - 2, cy - bh / 2 - 4, 4, 4, { fill: "#475569" });
  if (count > 0) {
    const br = Math.min(el.w, el.h) * 0.22;
    const bcx = el.x + el.w - br + 2;
    const bcy = el.y + br - 2;
    s.arc(bcx, bcy, br, { fill: "#dc2626", stroke: "#fff", strokeWidth: 1.5 });
    sketchText(s, count > 99 ? "99+" : String(count), bcx, bcy, {
      align: "center",
      base: "middle",
      size: br * 1,
      bold: true,
      color: "#fff"
    });
  }
});
r("mention", (s, el) => {
  const text = "@" + (el.label || "username");
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#e0eefc", stroke: "#3b82c4", lw: 1, r: 0.5 });
  sketchText(s, text, el.x + el.w / 2, el.y + el.h / 2, {
    align: "center",
    base: "middle",
    size: 12,
    bold: true,
    color: "#1a5590"
  });
});
r("ai-suggestion", (s, el) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "rgba(139,92,246,0.08)",
    stroke: "#8b5cf6",
    lw: 1.5,
    r: 0.5
  });
  sketchText(s, "\u2726", el.x + 10, el.y + el.h / 2, {
    base: "middle",
    size: 14,
    color: "#8b5cf6"
  });
  sketchText(s, el.label || "Apply suggestion", el.x + 32, el.y + el.h / 2, {
    base: "middle",
    size: 12,
    italic: true,
    color: "#5b21b6"
  });
  const hint = "[Tab]";
  const hintW = s.measureText(hint, { size: 11 }).width;
  sketchRect(s, el.x + el.w - hintW - 18, el.y + el.h / 2 - 9, hintW + 12, 18, {
    fill: "#fff",
    stroke: "#8b5cf6",
    lw: 1,
    r: 0.4
  });
  sketchText(s, hint, el.x + el.w - hintW / 2 - 12, el.y + el.h / 2, {
    align: "center",
    base: "middle",
    size: 11,
    bold: true,
    color: "#5b21b6",
    font: "ui-monospace, monospace"
  });
});
r("presence-cursor", (s, el) => {
  const color = strAttr(el, "cursorColor", "#dc2626");
  s.path(
    `M ${el.x} ${el.y} L ${el.x + 12} ${el.y + 12} L ${el.x + 6} ${el.y + 12} L ${el.x + 8} ${el.y + 18} L ${el.x + 5} ${el.y + 19} L ${el.x + 3} ${el.y + 13} L ${el.x} ${el.y + 16} Z`,
    { fill: color, stroke: "#fff", strokeWidth: 1.2 }
  );
  if (el.label) {
    const pillW = s.measureText(el.label, { size: 11, bold: true }).width + 14;
    sketchRect(s, el.x + 14, el.y + 12, pillW, 20, { fill: color, stroke: "transparent", r: 0.4 });
    sketchText(s, el.label, el.x + 14 + pillW / 2, el.y + 22, {
      align: "center",
      base: "middle",
      size: 11,
      bold: true,
      color: "#fff"
    });
  }
});
r("chart-area", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st), lw: 1 });
  const data = numListAttr(el, "data", [3, 5, 2, 7, 4, 8, 6]);
  const maxV = Math.max(1, ...data);
  const padding = 12;
  const innerW = el.w - padding * 2;
  const innerH = el.h - padding * 2;
  const stepX = innerW / Math.max(1, data.length - 1);
  let d = `M ${el.x + padding} ${el.y + el.h - padding}`;
  data.forEach((v, i) => {
    const px = el.x + padding + i * stepX;
    const py = el.y + el.h - padding - v / maxV * innerH;
    d += ` L ${s.jitter(px, 1)} ${s.jitter(py, 1)}`;
  });
  d += ` L ${el.x + el.w - padding} ${el.y + el.h - padding} Z`;
  s.path(d, { fill: "rgba(59,130,196,0.25)", stroke: "#3b82c4", strokeWidth: 2 });
});
r("chart-sparkline", (s, el) => {
  const data = numListAttr(el, "data", [3, 5, 2, 7, 4, 8, 6, 9, 5, 7]);
  const maxV = Math.max(...data);
  const minV = Math.min(...data);
  const range = Math.max(1, maxV - minV);
  const stepX = el.w / Math.max(1, data.length - 1);
  let d = "";
  data.forEach((v, i) => {
    const px = el.x + i * stepX;
    const py = el.y + el.h - (v - minV) / range * el.h;
    d += `${i === 0 ? "M" : " L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
  });
  s.path(d, { stroke: "#3b82c4", strokeWidth: 1.5, fill: "transparent" });
  const lastPx = el.x + (data.length - 1) * stepX;
  const lastPy = el.y + el.h - (data[data.length - 1] - minV) / range * el.h;
  s.arc(lastPx, lastPy, 2.5, { fill: "#3b82c4" });
});
r("gantt", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st), lw: 1 });
  const total = numAttr(el, "total", 8);
  const labelW = 80;
  for (let i = 0; i <= total; i++) {
    const x = el.x + labelW + i * (el.w - labelW) / total;
    s.line(x, el.y + 8, x, el.y + el.h - 8, { stroke: "#e4e4e7", strokeWidth: 1 });
  }
  const tasksAttr = strAttr(el, "tasks", "");
  const tasks = tasksAttr ? tasksAttr.split("|").map((t) => {
    const [name, startStr, endStr] = t.split(":");
    return { name: name?.trim() ?? "", start: Number(startStr), end: Number(endStr) };
  }) : [
    { name: "Design", start: 0, end: 3 },
    { name: "Build", start: 2, end: 6 },
    { name: "QA", start: 5, end: 7 },
    { name: "Ship", start: 7, end: 8 }
  ];
  const rowH = (el.h - 16) / Math.max(1, tasks.length);
  tasks.forEach((task, i) => {
    const ry = el.y + 8 + i * rowH;
    sketchText(s, task.name, el.x + 8, ry + rowH / 2, {
      base: "middle",
      size: 11,
      color: "#222"
    });
    const bx = el.x + labelW + task.start * (el.w - labelW) / total;
    const bw = (task.end - task.start) * (el.w - labelW) / total;
    sketchRect(s, bx, ry + 4, bw, rowH - 8, {
      fill: "#3b82c4",
      stroke: "#1a5590",
      lw: 1,
      r: 0.4
    });
  });
});
r("heatmap", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#fff", stroke: strokeColor(st), lw: 1 });
  const cols = clamp(numAttr(el, "cols", 12), 1, 50);
  const rows = clamp(numAttr(el, "rows", 7), 1, 20);
  const padding = 8;
  const cw = (el.w - padding * 2) / cols;
  const ch = (el.h - padding * 2) / rows;
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const v = (s.jitter(0.5, 1) + 0.5) % 1;
      const alpha = 0.1 + v * 0.85;
      s.rect(el.x + padding + c * cw, el.y + padding + row * ch, cw - 1, ch - 1, {
        fill: `rgba(34,197,94,${alpha.toFixed(2)})`
      });
    }
  }
});
r("map", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#e0e7ff", stroke: strokeColor(st), lw: 1 });
  for (let i = 0; i < 5; i++) {
    const y1 = el.y + 20 + i * (el.h / 6);
    const cy = y1 + (i % 2 === 0 ? 12 : -12);
    s.path(
      `M ${el.x} ${y1} Q ${el.x + el.w / 2} ${cy} ${el.x + el.w} ${y1 + (i % 2 === 0 ? 8 : -8)}`,
      { stroke: "#fff", strokeWidth: 3, fill: "transparent" }
    );
  }
  const px = el.x + el.w / 2;
  const py = el.y + el.h / 2 - 8;
  s.path(
    `M ${px} ${py - 14} A 8 8 0 1 1 ${px - 1e-3} ${py - 14} L ${px} ${py + 4} Z`,
    { fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: 1.5 }
  );
  s.arc(px, py - 8, 3, { fill: "#fff" });
  if (el.label) {
    sketchText(s, el.label, px, py + 20, {
      align: "center",
      base: "top",
      size: 12,
      bold: true,
      color: "#222"
    });
  }
});
r("code-diff", (s, el) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: "#1e293b", stroke: "#0f172a", lw: 1.5, r: 0.4 });
  const text = el.label || "- function old() {}\n+ function newer() {\n+   return true\n+ }\n  // unchanged";
  const lines = text.split("\n");
  const lineH = 16;
  const maxLines = Math.floor((el.h - 12) / lineH);
  lines.slice(0, maxLines).forEach((line, i) => {
    const ly = el.y + 8 + i * lineH;
    let bgColor = "";
    let prefix = " ";
    let textColor = "#e2e8f0";
    if (line.startsWith("+")) {
      bgColor = "rgba(34,197,94,0.18)";
      textColor = "#86efac";
      prefix = "+";
    } else if (line.startsWith("-")) {
      bgColor = "rgba(239,68,68,0.18)";
      textColor = "#fca5a5";
      prefix = "-";
    }
    if (bgColor) s.rect(el.x + 1, ly, el.w - 2, lineH, { fill: bgColor });
    sketchText(s, prefix, el.x + 8, ly + lineH / 2, {
      base: "middle",
      size: 12,
      color: textColor,
      font: "ui-monospace, monospace"
    });
    sketchText(s, line.replace(/^[+\-]\s?/, ""), el.x + 24, ly + lineH / 2, {
      base: "middle",
      size: 12,
      color: textColor,
      font: "ui-monospace, monospace"
    });
  });
});
r("glass-window", (s, el) => {
  sketchRect(s, el.x + 4, el.y + 6, el.w, el.h, { fill: "rgba(0,0,0,0.18)" });
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "rgba(241,245,249,0.85)",
    stroke: "rgba(255,255,255,0.7)",
    lw: 1.5,
    r: 1
  });
  s.rect(el.x + 2, el.y + 2, el.w - 4, 2, { fill: "rgba(255,255,255,0.55)" });
  const handleW = Math.min(el.w * 0.18, 80);
  s.rect(el.x + (el.w - handleW) / 2, el.y + el.h + 8, handleW, 5, {
    fill: "rgba(100,116,139,0.6)"
  });
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + 18, {
      align: "center",
      base: "middle",
      size: 14,
      bold: true,
      color: "#222"
    });
  }
});
r("gaze-cursor", (s, el) => {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const r2 = Math.min(el.w, el.h) / 2 - 3;
  s.arc(cx, cy, r2, { stroke: "#3b82c4", strokeWidth: 2, fill: "transparent" });
  s.arc(cx, cy, Math.max(2, r2 * 0.18), { fill: "#3b82c4" });
});
r("pinch-indicator", (s, el) => {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const r2 = Math.min(el.w, el.h) / 4;
  s.arc(cx - r2 * 0.7, cy, r2, { fill: "rgba(255,255,255,0.85)", stroke: "#0f172a", strokeWidth: 1.5 });
  s.arc(cx + r2 * 0.7, cy, r2, { fill: "rgba(255,255,255,0.85)", stroke: "#0f172a", strokeWidth: 1.5 });
  s.arc(cx, cy, 3, { fill: "#3b82c4" });
  s.arc(cx, cy, r2 * 1.6, { stroke: "rgba(59,130,196,0.4)", strokeWidth: 1, fill: "transparent" });
});
r("volumetric-scene", (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "#1e293b",
    stroke: strokeColor(st),
    lw: 1.5,
    r: 0.4
  });
  const horizon = el.y + el.h * 0.55;
  for (let i = 0; i <= 6; i++) {
    const x = el.x + i / 6 * el.w;
    s.path(
      `M ${x} ${horizon} L ${el.x + el.w * (0.2 + 0.6 * (i / 6))} ${el.y + el.h - 4}`,
      { stroke: "rgba(148,163,184,0.4)", strokeWidth: 1, fill: "transparent" }
    );
  }
  for (let i = 1; i <= 3; i++) {
    const y = horizon + i / 3 * (el.h - (horizon - el.y) - 8);
    sketchLine(s, el.x + el.w * 0.18, y, el.x + el.w * 0.82, y, {
      stroke: "rgba(148,163,184,0.3)",
      lw: 1
    });
  }
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h * 0.62;
  const cs = Math.min(el.w, el.h) * 0.15;
  s.path(`M ${cx - cs / 2} ${cy} L ${cx + cs / 2} ${cy} L ${cx + cs / 2} ${cy + cs} L ${cx - cs / 2} ${cy + cs} Z`, {
    fill: "#475569",
    stroke: "#94a3b8",
    strokeWidth: 1.5
  });
  s.path(
    `M ${cx - cs / 2} ${cy} L ${cx - cs / 2 + cs * 0.4} ${cy - cs * 0.4} L ${cx + cs / 2 + cs * 0.4} ${cy - cs * 0.4} L ${cx + cs / 2} ${cy} Z`,
    { fill: "#64748b", stroke: "#94a3b8", strokeWidth: 1.5 }
  );
  s.path(
    `M ${cx + cs / 2} ${cy} L ${cx + cs / 2 + cs * 0.4} ${cy - cs * 0.4} L ${cx + cs / 2 + cs * 0.4} ${cy + cs * 0.6} L ${cx + cs / 2} ${cy + cs} Z`,
    { fill: "#334155", stroke: "#94a3b8", strokeWidth: 1.5 }
  );
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + 16, {
      align: "center",
      base: "middle",
      size: 12,
      italic: true,
      color: "#cbd5e1"
    });
  }
});
r("passthrough-frame", (s, el) => {
  const inset = 10;
  s.rect(el.x, el.y, el.w, inset, { fill: "rgba(15,23,42,0.85)" });
  s.rect(el.x, el.y + el.h - inset, el.w, inset, { fill: "rgba(15,23,42,0.85)" });
  s.rect(el.x, el.y + inset, inset, el.h - inset * 2, { fill: "rgba(15,23,42,0.85)" });
  s.rect(el.x + el.w - inset, el.y + inset, inset, el.h - inset * 2, { fill: "rgba(15,23,42,0.85)" });
  sketchRect(s, el.x + inset, el.y + inset, el.w - inset * 2, el.h - inset * 2, {
    fill: "transparent",
    stroke: "#94a3b8",
    lw: 1.5
  });
  s.arc(el.x + el.w - 18, el.y + 18, 5, { fill: "#dc2626", stroke: "#fff", strokeWidth: 1 });
  sketchText(s, el.label || "PASSTHROUGH", el.x + el.w / 2, el.y + el.h - inset / 2, {
    align: "center",
    base: "middle",
    size: 10,
    bold: true,
    color: "#fff"
  });
});
r("voice-input", (s, el) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: "#0f172a",
    stroke: "#3b82c4",
    lw: 2,
    r: 1
  });
  const barCount = 12;
  const barGap = 4;
  const totalGap = (barCount - 1) * barGap;
  const barW = (el.w * 0.7 - totalGap) / barCount;
  const startX = el.x + (el.w - barW * barCount - totalGap) / 2;
  for (let i = 0; i < barCount; i++) {
    const dist = Math.abs(i - barCount / 2) / (barCount / 2);
    const heightFactor = 0.4 + (1 - dist) * 0.6;
    const bh = el.h * 0.55 * heightFactor;
    s.rect(startX + i * (barW + barGap), el.y + (el.h - bh) / 2, barW, bh, {
      fill: "#3b82c4"
    });
  }
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + el.h - 10, {
      align: "center",
      base: "middle",
      size: 11,
      bold: true,
      color: "#94a3b8"
    });
  }
});
function selDash(s, el, st) {
  s.rect(el.x - 2, el.y - 2, el.w + 4, el.h + 4, {
    stroke: strokeColor(st),
    strokeWidth: 1
  });
}
function numAttr(el, key, fallback) {
  const v = el.attrs[key];
  return typeof v === "number" ? v : fallback;
}
function strAttr(el, key, fallback) {
  const v = el.attrs[key];
  return typeof v === "string" ? v : fallback;
}
function pipeListAttr(el, key, fallback) {
  const v = el.attrs[key];
  if (typeof v !== "string" || v === "") return fallback;
  return v.split("|").map((x) => x.trim());
}
function numListAttr(el, key, fallback) {
  const v = el.attrs[key];
  if (typeof v !== "string" || v === "") return fallback;
  const out = [];
  for (const part of v.split(",")) {
    const n = Number(part.trim());
    if (Number.isFinite(n)) out.push(n);
  }
  return out.length ? out : fallback;
}
function boolAttr(el, key, fallback) {
  const v = el.attrs[key];
  if (v === void 0) return fallback;
  if (typeof v === "number") return v !== 0;
  return v === "true" || v === "yes" || v === "1" || v === "";
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function drawStar(s, cx, cy, r2, opts) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 5 * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r2 : r2 * 0.45;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    points.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  s.path(points.join(" ") + " Z", opts);
}

// src/line-parser.ts
var ELEMENT_TYPE_SET3 = new Set(ELEMENT_TYPES);
function isKnownElementType(t) {
  return ELEMENT_TYPE_SET3.has(t);
}
var KEYWORDS = /* @__PURE__ */ new Set([
  "element",
  "text",
  "arrow",
  "row",
  "col",
  "end",
  "component",
  "slot"
]);
function tokenizeWithOffsets(trimmed) {
  const out = [];
  const len = trimmed.length;
  let i = 0;
  while (i < len) {
    while (i < len && /\s/.test(trimmed[i])) i++;
    if (i >= len) break;
    if (trimmed[i] === '"') {
      const start2 = i;
      const r2 = readQuoted2(trimmed, i + 1);
      out.push({
        value: r2.value,
        quoted: true,
        start: start2,
        end: r2.end,
        raw: trimmed.slice(start2, r2.end),
        closed: r2.closed,
        unclosedAt: r2.closed ? void 0 : start2
      });
      i = r2.end;
      continue;
    }
    const start = i;
    let buf = "";
    let innerClosed = true;
    let innerUnclosedAt;
    while (i < len && !/\s/.test(trimmed[i])) {
      if (trimmed[i] === '"') {
        const openedAt = i;
        const inner = readQuoted2(trimmed, i + 1);
        buf += inner.value;
        i = inner.end;
        if (!inner.closed) {
          innerClosed = false;
          if (innerUnclosedAt === void 0) innerUnclosedAt = openedAt;
        }
      } else {
        buf += trimmed[i];
        i++;
      }
    }
    out.push({
      value: buf,
      quoted: false,
      start,
      end: i,
      raw: trimmed.slice(start, i),
      closed: innerClosed,
      unclosedAt: innerClosed ? void 0 : innerUnclosedAt
    });
  }
  return out;
}
function readQuoted2(line, start) {
  const len = line.length;
  let j = start;
  let buf = "";
  while (j < len) {
    const c = line[j];
    if (c === "\\" && j + 1 < len) {
      const next = line[j + 1];
      if (next === '"' || next === "\\") {
        buf += next;
        j += 2;
        continue;
      }
      if (next === "n") {
        buf += "\n";
        j += 2;
        continue;
      }
      if (next === "t") {
        buf += "	";
        j += 2;
        continue;
      }
    }
    if (c === '"') break;
    buf += c;
    j++;
  }
  const closed = j < len && line[j] === '"';
  return { value: buf, end: closed ? j + 1 : j, closed };
}
function parseLine(raw, lineNo) {
  const indent = raw.match(/^\s*/)?.[0] ?? "";
  const trimmed = raw.slice(indent.length);
  if (trimmed === "") return base("blank", lineNo, raw, trimmed, indent, null, []);
  if (trimmed.startsWith("#")) return base("comment", lineNo, raw, trimmed, indent, null, []);
  const all = tokenizeWithOffsets(trimmed);
  if (all.length === 0) return base("blank", lineNo, raw, trimmed, indent, null, []);
  const headToken = all[0];
  const head = headToken.value;
  if (!KEYWORDS.has(head)) {
    return base("unknown", lineNo, raw, trimmed, indent, null, []);
  }
  const kind = head;
  const rest = all.slice(1);
  let typeToken = null;
  if (kind === "element" && rest.length > 0) {
    const tt = rest[0];
    const t = tt.value;
    const hash = t.indexOf("#");
    typeToken = hash >= 0 ? { type: t.slice(0, hash), id: t.slice(hash + 1), token: tt } : { type: t, token: tt };
  }
  return {
    kind,
    lineNo,
    raw,
    trimmed,
    tokens: rest,
    keyword: headToken,
    indent,
    typeToken
  };
}
function base(kind, lineNo, raw, trimmed, indent, keyword, tokens) {
  return { kind, lineNo, raw, trimmed, tokens, keyword, indent, typeToken: null };
}
function countPositional(tokens) {
  let n = 0;
  for (const t of tokens) {
    if (!t.quoted && t.value.includes("=")) break;
    n++;
  }
  return n;
}
function columnFromOffset(indent, offsetInTrimmed) {
  return indent.length + offsetInTrimmed + 1;
}

// src/rules.ts
var INVENTED_TYPE_MAP = /* @__PURE__ */ new Map([
  ["frame", "box"],
  ["container", "box"],
  ["section", "box"],
  ["stack", "col"],
  ["vstack", "col"],
  ["hstack", "row"],
  ["group", "row"],
  ["link", "button"],
  ["textlink", "button"],
  ["heading1", "heading"],
  ["heading2", "heading"],
  ["heading3", "heading"],
  ["h1", "heading"],
  ["h2", "heading"],
  ["h3", "heading"],
  ["subheading", "heading"],
  ["paragraph", "label"],
  ["text-block", "label"],
  ["header", "navbar"],
  ["pageheader", "navbar"],
  ["footer", "box"],
  ["menu-bar", "navbar"],
  ["menubar", "navbar"],
  ["nav", "navbar"],
  ["topbar", "navbar"],
  ["appbar", "navbar"],
  ["tab", "tabs"],
  ["tabbar", "tabs"],
  ["tab-bar", "tabs"],
  ["icon", "button"],
  ["iconbutton", "button"],
  ["icon-button", "button"],
  ["pill", "chip"],
  ["tag", "chip"],
  ["Card", "card"],
  ["Panel", "card"],
  ["Button", "button"],
  ["NavBar", "navbar"],
  ["Heading", "heading"],
  ["Input", "input"],
  ["Textarea", "textarea"],
  ["Sidebar", "sidebar"],
  ["Avatar", "avatar"],
  ["Spinner", "spinner"],
  ["Divider", "divider"],
  ["Spacer", "divider"],
  ["StatusBar", "status-bar"],
  ["HomeIndicator", "home-indicator"],
  ["PhoneFrame", "phone-frame"],
  ["WindowFrame", "window-frame"],
  ["BrowserFrame", "browser-frame"],
  ["ChatBubble", "chat-bubble"],
  ["CodeBlock", "code-block"],
  ["ChartBar", "chart-bar"],
  ["ChartLine", "chart-line"],
  ["ChartDonut", "chart-donut"],
  ["FAB", "fab"],
  ["Fab", "fab"],
  ["FloatingButton", "fab"]
]);
var FLEX_ALIGN_VALUES2 = /* @__PURE__ */ new Set(["start", "middle", "end", "stretch"]);
var TEXT_ALIGN_VALUES = /* @__PURE__ */ new Set(["left", "center", "right"]);
var elementArity = (lines) => {
  const out = [];
  for (const ln of lines) {
    if (ln.kind !== "element") continue;
    const positional = countPositional(ln.tokens);
    if (positional >= 6) continue;
    if (positional < 5) {
      const tok = ln.tokens[Math.max(0, positional - 1)] ?? ln.keyword;
      out.push({
        rule: "wrong-arity",
        severity: "error",
        line: ln.lineNo,
        column: columnFromOffset(ln.indent, tok.start),
        endColumn: columnFromOffset(ln.indent, tok.end),
        message: `element line has only ${positional} positional slot${positional === 1 ? "" : "s"} \u2014 Boceto needs 6 (TYPE X Y W H "Label"). Add the missing positional args before any \`key=value\` attrs.`
      });
      continue;
    }
    const fifth = ln.tokens[4];
    if (fifth.quoted) {
      out.push({
        rule: "missing-coord",
        severity: "error",
        line: ln.lineNo,
        column: columnFromOffset(ln.indent, fifth.start),
        endColumn: columnFromOffset(ln.indent, fifth.end),
        message: `element line has 5 slots ending in a quoted label, but Boceto requires 6 (TYPE X Y W H "Label"). One of X/Y/W/H is missing \u2014 count the numbers between TYPE and the label and add the dropped coord.`
        // No autofix — we don't know which of X/Y/W/H was dropped.
      });
      continue;
    }
    const insertOffset = fifth.end;
    const col = columnFromOffset(ln.indent, insertOffset);
    const newTrimmed = ln.trimmed.slice(0, insertOffset) + ' ""' + ln.trimmed.slice(insertOffset);
    const fix = {
      line: ln.lineNo,
      newLine: ln.indent + newTrimmed,
      label: 'insert `""` after H'
    };
    out.push({
      rule: "missing-label",
      severity: "error",
      line: ln.lineNo,
      column: col,
      endColumn: col,
      message: 'element line is missing the required label slot \u2014 every element needs `element TYPE X Y W H "Label"` before any attrs. Use `""` for chrome elements that show no text.',
      fix
    });
  }
  return out;
};
function collectUserDefinedComponents(lines) {
  const names = /* @__PURE__ */ new Set();
  for (const ln of lines) {
    if (ln.kind !== "component") continue;
    const m = ln.trimmed.match(/^component\s+([A-Za-z][A-Za-z0-9_-]*)/);
    if (m && m[1]) names.add(m[1]);
  }
  return names;
}
var inventedType = (lines) => {
  const out = [];
  const userDefined = collectUserDefinedComponents(lines);
  for (const ln of lines) {
    if (ln.kind !== "element" || !ln.typeToken) continue;
    const { type: t, token: tok, id } = ln.typeToken;
    if (isKnownElementType(t)) continue;
    if (userDefined.has(t)) continue;
    const real = INVENTED_TYPE_MAP.get(t) ?? INVENTED_TYPE_MAP.get(t.toLowerCase());
    if (!real) continue;
    out.push({
      rule: "invented-type",
      severity: "error",
      line: ln.lineNo,
      // Underline only the type portion of the token, not `#id` if present.
      column: columnFromOffset(ln.indent, tok.start),
      endColumn: columnFromOffset(ln.indent, tok.start + t.length),
      message: `"${t}" is not a real Boceto element type \u2014 use \`${real}\` instead. (See references/elements.md for the full catalog of 83 types.)`,
      fix: makeReplaceTypeFix(ln, tok, t, real)
    });
  }
  return out;
};
var unknownType = (lines) => {
  const out = [];
  const userDefined = collectUserDefinedComponents(lines);
  for (const ln of lines) {
    if (ln.kind !== "element" || !ln.typeToken) continue;
    const { type: t, token: tok } = ln.typeToken;
    if (isKnownElementType(t)) continue;
    if (userDefined.has(t)) continue;
    if (INVENTED_TYPE_MAP.has(t) || INVENTED_TYPE_MAP.has(t.toLowerCase())) continue;
    const suggestion = closestKnownType(t);
    out.push({
      rule: "unknown-type",
      severity: "warning",
      line: ln.lineNo,
      column: columnFromOffset(ln.indent, tok.start),
      endColumn: columnFromOffset(ln.indent, tok.start + t.length),
      message: `"${t}" is not a built-in element type. ` + (suggestion ? `Did you mean \`${suggestion}\`? ` : "") + "If this is a composite component you defined in this doc, ignore \u2014 otherwise check references/elements.md."
    });
  }
  return out;
};
var badCoord = (lines) => {
  const out = [];
  for (const ln of lines) {
    if (ln.kind !== "element" && ln.kind !== "row" && ln.kind !== "col" && ln.kind !== "text") continue;
    const startAt = ln.kind === "element" ? 1 : 0;
    const positional = countPositional(ln.tokens);
    const bads = [];
    let coordCount = 0;
    for (let i = startAt; i < positional && coordCount < 4; i++) {
      const tok = ln.tokens[i];
      coordCount++;
      if (tok.quoted) continue;
      const v = tok.value;
      if (v === "auto" && coordCount >= 3) continue;
      const n = Number(v);
      if (Number.isInteger(n) && n >= 0) continue;
      if (!Number.isFinite(n)) continue;
      const fixed = !Number.isInteger(n) ? Math.max(0, Math.round(n)) : 0;
      bads.push({
        tokIdx: i,
        col: columnFromOffset(ln.indent, tok.start),
        endCol: columnFromOffset(ln.indent, tok.end),
        old: v,
        fixed
      });
    }
    if (bads.length === 0) continue;
    let patched = ln.trimmed;
    for (const b of [...bads].reverse()) {
      const tok = ln.tokens[b.tokIdx];
      patched = patched.slice(0, tok.start) + String(b.fixed) + patched.slice(tok.end);
    }
    const fix = {
      line: ln.lineNo,
      newLine: ln.indent + patched,
      label: "round + clamp coords"
    };
    for (let k = 0; k < bads.length; k++) {
      const b = bads[k];
      out.push({
        rule: "bad-coord",
        severity: "error",
        line: ln.lineNo,
        column: b.col,
        endColumn: b.endCol,
        message: `coord must be a non-negative integer \u2014 got \`${b.old}\`. Boceto's grammar rejects fractions and negatives in X/Y/W/H slots.`,
        fix: k === 0 ? fix : void 0
      });
    }
  }
  return out;
};
var alignVsTextAlign = (lines) => {
  const out = [];
  for (const ln of lines) {
    if (ln.kind !== "element") continue;
    for (const tok of ln.tokens) {
      if (tok.quoted) continue;
      const m = tok.value.match(/^align=([A-Za-z]+)$/);
      if (!m) continue;
      const value = m[1];
      if (FLEX_ALIGN_VALUES2.has(value)) continue;
      if (!TEXT_ALIGN_VALUES.has(value)) continue;
      const newTrimmed = ln.trimmed.slice(0, tok.start) + `textAlign=${value}` + ln.trimmed.slice(tok.end);
      out.push({
        rule: "align-vs-textAlign",
        severity: "warning",
        line: ln.lineNo,
        column: columnFromOffset(ln.indent, tok.start),
        endColumn: columnFromOffset(ln.indent, tok.end),
        message: `\`align=${value}\` on an \`element\` line means flex cross-axis alignment (values: start|middle|end|stretch). For horizontal text alignment, use \`textAlign=${value}\` instead \u2014 that's the attribute the renderer consults.`,
        fix: {
          line: ln.lineNo,
          newLine: ln.indent + newTrimmed,
          label: "rename `align` \u2192 `textAlign`"
        }
      });
    }
  }
  return out;
};
var unclosedBlock = (lines) => {
  const out = [];
  const stack = [];
  for (const ln of lines) {
    if (ln.kind === "row" || ln.kind === "col" || ln.kind === "component") {
      const kw = ln.keyword;
      stack.push({
        line: ln.lineNo,
        kind: ln.kind,
        col: columnFromOffset(ln.indent, kw.start),
        endCol: columnFromOffset(ln.indent, kw.end)
      });
    } else if (ln.kind === "end") {
      stack.pop();
    } else if (ln.kind === "element" && ln.trimmed.endsWith(":")) {
      const kw = ln.keyword;
      stack.push({
        line: ln.lineNo,
        kind: "element-block",
        col: columnFromOffset(ln.indent, kw.start),
        endCol: columnFromOffset(ln.indent, kw.end)
      });
    }
  }
  for (const frame of stack) {
    out.push({
      rule: "unclosed-block",
      severity: "error",
      line: frame.line,
      column: frame.col,
      endColumn: frame.endCol,
      message: `\`${frame.kind}\` block opened on line ${frame.line} is never closed. Add an \`end\` line.`
    });
  }
  return out;
};
var unterminatedString = (lines) => {
  const out = [];
  for (const ln of lines) {
    if (ln.kind === "blank" || ln.kind === "comment") continue;
    for (const tok of ln.tokens) {
      if (tok.closed !== false) continue;
      const openAt = tok.unclosedAt ?? tok.start;
      out.push({
        rule: "unterminated-string",
        severity: "warning",
        line: ln.lineNo,
        column: columnFromOffset(ln.indent, openAt),
        // Highlight from the orphan `"` to the end of the line.
        endColumn: columnFromOffset(ln.indent, ln.trimmed.length),
        message: 'string literal opened with `"` but never closed before end of line. The parser silently accepts this and reads to the end of the line, but it almost always means a typo \u2014 close the string with `"`.',
        fix: {
          line: ln.lineNo,
          newLine: ln.raw + '"',
          label: 'append closing `"`'
        }
      });
    }
  }
  return out;
};
var RULES = {
  // The element-arity check is a single Rule that emits issues under
  // three different rule ids depending on what's wrong. Listed once
  // here so it runs once per lint pass.
  "element-arity": elementArity,
  "invented-type": inventedType,
  "unknown-type": unknownType,
  "bad-coord": badCoord,
  "align-vs-textAlign": alignVsTextAlign,
  "unclosed-block": unclosedBlock,
  "unterminated-string": unterminatedString
};
function makeReplaceTypeFix(ln, tok, badType, realType, id) {
  const replaceEnd = tok.start + badType.length;
  const newTrimmed = ln.trimmed.slice(0, tok.start) + realType + ln.trimmed.slice(replaceEnd);
  return {
    line: ln.lineNo,
    newLine: ln.indent + newTrimmed,
    label: `replace \`${badType}\` \u2192 \`${realType}\``
  };
}
function closestKnownType(t) {
  let best = null;
  for (const real of ELEMENT_TYPES) {
    const d = editDistance(t.toLowerCase(), real);
    if (best === null || d < best.d) best = { type: real, d };
  }
  if (!best) return null;
  return best.d <= Math.max(1, Math.floor(t.length / 3) + 1) ? best.type : null;
}
function editDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

// src/lint.ts
function lint(source, options = {}) {
  const disabled = new Set(options.disable ?? []);
  const MAX_PASSES = 6;
  let current = source;
  let allIssues = [];
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const lines = current.split("\n").map((raw, i) => parseLine(raw, i + 1));
    const passIssues = [];
    for (const [name, rule] of Object.entries(RULES)) {
      if (disabled.has(name)) continue;
      passIssues.push(...rule(lines));
    }
    passIssues.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
    if (pass === 0) allIssues = passIssues;
    const fixableThisPass = passIssues.filter((i) => i.fix);
    if (fixableThisPass.length === 0) break;
    current = applyFixes(current, fixableThisPass);
  }
  if (!options.skipParseCheck) {
    const fences = findBocetoFences(current);
    if (fences.length === 0) {
      const isRaw = !current.includes("```") && !/^---/m.test(current.trim());
      try {
        parse(current, { raw: isRaw });
      } catch (err) {
        const pe = err;
        allIssues.push(parseErrorIssue(pe, 0));
      }
    } else {
      try {
        parse(current);
      } catch (err) {
        const pe = err;
        let offset = fences[0].bodyStartLine - 1;
        const peLine = pe.line ?? 1;
        for (const fence of fences) {
          const blockLines = fence.body.split("\n").length;
          if (peLine <= blockLines) {
            offset = fence.bodyStartLine - 1;
            break;
          }
        }
        allIssues.push(parseErrorIssue(pe, offset));
      }
    }
  }
  const errorCount = allIssues.filter((i) => i.severity === "error").length;
  const warningCount = allIssues.filter((i) => i.severity === "warning").length;
  const infoCount = allIssues.filter((i) => i.severity === "info").length;
  return { issues: allIssues, fixed: current, errorCount, warningCount, infoCount };
}
function findBocetoFences(source) {
  const lines = source.split("\n");
  const fences = [];
  let inFence = false;
  let bodyStart = -1;
  const bodyLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inFence) {
      if (/^\s*```boceto(?::[^\s`]+)?\s*$/.test(line)) {
        inFence = true;
        bodyStart = i + 2;
        bodyLines.length = 0;
      }
    } else {
      if (/^\s*```\s*$/.test(line)) {
        fences.push({ body: bodyLines.join("\n"), bodyStartLine: bodyStart });
        inFence = false;
        bodyStart = -1;
        bodyLines.length = 0;
      } else {
        bodyLines.push(line);
      }
    }
  }
  if (inFence && bodyStart > 0) {
    fences.push({ body: bodyLines.join("\n"), bodyStartLine: bodyStart });
  }
  return fences;
}
function parseErrorIssue(pe, lineOffset) {
  const line = (pe.line ?? 1) + lineOffset;
  return {
    rule: "parse-error",
    severity: "error",
    line,
    column: 1,
    endColumn: 1,
    message: pe.message
  };
}
function applyFixes(source, issues) {
  const lines = source.split("\n");
  const patched = /* @__PURE__ */ new Map();
  for (const issue of issues) {
    if (!issue.fix) continue;
    patched.set(issue.fix.line, issue.fix.newLine);
  }
  if (patched.size === 0) return source;
  for (const [lineNo, newLine] of patched) {
    lines[lineNo - 1] = newLine;
  }
  return lines.join("\n");
}

export { RULES, applyFixes, lint };
//# sourceMappingURL=browser.js.map
//# sourceMappingURL=browser.js.map