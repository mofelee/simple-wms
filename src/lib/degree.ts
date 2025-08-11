/**
 * 从 UDI-DI 接口返回的设备信息中尝试解析度数（近视/远视屈光度）。
 * 直接基于字段正则提取：优先 `产品其他描述信息`，其次 `规格型号`。
 * 未匹配时弹出输入框手动输入，完成后会自动聚焦回扫码的 ScanBox。
 */
export async function parseDegreeFromApi(deviceInfo: any, promptFn?: (options: { title?: string; description?: string; placeholder?: string; defaultValue?: string; required?: boolean }) => Promise<string | null>): Promise<string> {
  // 容错：空对象直接走手动输入逻辑
  const extraDesc: string = safeString(deviceInfo?.["产品其他描述信息"]);
  const modelSpec: string = safeString(deviceInfo?.["规格型号"]);

  // 优先从「产品其他描述信息」提取
  const fromExtra = extractDegree(extraDesc);
  if (fromExtra) return normalizeToHundredths(fromExtra);

  // 其次从「规格型号」提取
  const fromModel = extractDegree(modelSpec);
  if (fromModel) return normalizeToHundredths(fromModel);

  // 手动输入兜底
  const manual = await promptForDegree(promptFn);
  // 输入结束后聚焦回扫码框
  focusScanBoxSoon();
  return normalizeToHundredths(manual);
}

function safeString(input: unknown): string {
  if (input == null) return "";
  return String(input);
}

function normalizeSymbols(input: string): string {
  return input
    // 全角正负号 → 半角
    .replace(/[＋﹢＋]/g, "+")
    .replace(/[－﹣—–−]/g, "-")
    // 全角数字 → 半角
    .replace(/[０１２３４５６７８９]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xFEE0))
    // 全角点号 → 半角
    .replace(/[．。]/g, ".")
    // 统一空白
    .replace(/[\u00A0\u2000-\u200B]/g, " ");
}

/**
 * 在给定文本中提取最后一次出现的度数字符串，例如 "-7.00"、"-02.75"、"+1.5D"、"-3度"。
 * 返回去空格且去掉后缀 D/度 的结果；匹配失败返回空字符串。
 */
function extractDegree(text: string): string {
  if (!text) return "";
  const normalized = normalizeSymbols(text);
  // 度数模式：要么有明确的度数后缀，要么是带符号的数字
  const regexWithSuffix = /([+\-]?\s*\d{1,3}(?:\.\d{1,2})?)\s*(?:[dD]|度)\b/g;
  const regexWithSign = /([+\-]\s*\d{1,3}(?:\.\d{1,2})?)\b/g;
  
  // 先尝试匹配带后缀的度数
  let matches = Array.from(normalized.matchAll(regexWithSuffix));
  if (matches.length > 0) {
    return matches[matches.length - 1][1].replace(/\s+/g, "");
  }
  
  // 如果没有带后缀的，尝试匹配带符号的数字
  matches = Array.from(normalized.matchAll(regexWithSign));
  if (matches.length === 0) return "";
  return matches[matches.length - 1][1].replace(/\s+/g, "");
}

/**
 * 手动输入度数。接受可选符号，最多两位小数。返回归一化后的值；不合法或取消返回空字符串。
 */
async function promptForDegree(promptFn?: (options: { title?: string; description?: string; placeholder?: string; defaultValue?: string; required?: boolean }) => Promise<string | null>): Promise<string> {
  try {
    let input: string | null = null;
    
    if (promptFn) {
      // 使用传入的 prompt 函数（来自 React context）
      input = await promptFn({
        title: "输入度数",
        description: "未能从接口数据中解析到度数。请输入度数，可输入小数或去点格式。若不加符号将自动补全负号。",
        placeholder: "例如：700（自动变为-700）、+700、-2.75",
        defaultValue: "",
        required: false
      });
    } else if (typeof window !== "undefined" && typeof window.prompt === "function") {
      // 回退到原生 window.prompt
      input = window.prompt(
        "未能从接口数据中解析到度数。请输入度数，可输入小数或去点格式。若不加符号将自动补全负号（例如：700→-700、+700→+700、-2.75→-2.75）：",
        ""
      );
    } else {
      // 非浏览器环境或没有可用的 prompt
      return "";
    }
    
    if (input == null) return "";
    const normalized = normalizeSymbols(String(input).trim());
    
    // 1) 带小数形式：±? 整数[.小数(1-2)]
    const m1 = normalized.match(/^([+\-]?\s*\d{1,3}(?:\.\d{1,2})?)\s*(?:[dD]|度)?$/);
    if (m1) {
      const value = m1[1].replace(/\s+/g, "");
      return autoCompleteNegativeSign(value);
    }
    
    // 2) 去点形式（百份位）：±? 数字（1-4位）
    const m2 = normalized.match(/^([+\-]?\s*\d{1,4})$/);
    if (m2) {
      const value = m2[1].replace(/\s+/g, "");
      return autoCompleteNegativeSign(value);
    }
    
    return "";
  } catch {
    return "";
  }
}

/**
 * 自动补全负号：如果输入的度数没有符号，则自动添加负号
 * 规则：
 * - 如果已经有 + 或 - 符号，保持不变
 * - 如果没有符号，自动添加 - 号（因为大多数隐形眼镜都是近视度数）
 */
function autoCompleteNegativeSign(value: string): string {
  if (!value) return value;
  
  // 检查是否已经有符号
  if (value.startsWith('+') || value.startsWith('-')) {
    return value; // 已有符号，保持不变
  }
  
  // 没有符号，自动添加负号
  return `-${value}`;
}

/** 将焦点恢复到 ScanBox 的输入区域 */
function focusScanBoxSoon(): void {
  try {
    if (typeof document === "undefined") return;
    setTimeout(() => {
      try {
        const el = document.querySelector('[aria-label="扫码输入区域"]') as HTMLElement | null;
        el?.focus();
      } catch {
        /* noop */
      }
    }, 0);
  } catch {
    /* noop */
  }
}

/**
 * 归一化到“去点的百份位字符串”。
 * 规则：
 * - 若含小数点：将小数补齐到两位，然后移除小数点；再移除前导零（若全为零，则返回 "0"）。
 * - 若不含小数点：视为已是百份位，直接返回去空格的原值。
 * - 始终保留原有符号（+/-）。
 */
function normalizeToHundredths(value: string): string {
  if (!value) return "";
  const s = String(value).trim();
  const signMatch = s.match(/^([+\-])?(.*)$/);
  const sign = signMatch?.[1] ?? "";
  const body = signMatch?.[2] ?? s;
  if (body.includes(".")) {
    const m = body.match(/^(\d{1,3})(?:\.(\d{1,2}))?$/);
    if (!m) return "";
    const intPart = m[1];
    const fracRaw = m[2] ?? "";
    const frac = fracRaw.length === 0 ? "00" : fracRaw.length === 1 ? `${fracRaw}0` : fracRaw;
    // 拼接并去掉前导零（但保留至少一位数字）
    let joined = `${intPart}${frac}`;
    if (joined === "000") {
      joined = "0"; // 全零情况
    } else {
      joined = joined.replace(/^0+/, "") || "0"; // 去前导零，但至少保留一个字符
    }
    return `${sign}${joined}`;
  }
  // 无小数点：认为已经是百份位表示，直接返回（去除空格）
  return `${sign}${body.replace(/\s+/g, "")}`;
}


