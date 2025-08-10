/**
 * GS1 解析器 - 简化接口
 * 
 * 本模块提供了解析 GS1 数据的简化接口。
 * 外部用户只需要传入一个字符串即可获得解析结果。
 */

import gs1VocabularyData from './gs1_ai.json';
import { 
  GS1Parser, 
  createGS1Parser, 
  parseGS1AutoStrict,
  ParsedGS1Data,
  ParsedGS1Element,
  GS1ParserOptions,
  ValidationResult
} from './gs1parser';

// 预配置的 GS1 解析器实例，使用默认设置
let defaultParser: GS1Parser | null = null;

/**
 * 使用最优设置初始化默认的 GS1 解析器
 */
function initializeParser(): GS1Parser {
  if (!defaultParser) {
    const defaultOptions: GS1ParserOptions = {
      strict: true,
      groupElements: true,
      validateCheckDigits: true,
      resolveDependencies: true
    };
    
    defaultParser = createGS1Parser(gs1VocabularyData, defaultOptions);
  }
  
  return defaultParser;
}

/**
 * 自动格式检测并解析 GS1 数据字符串
 * 
 * @param input - GS1 数据字符串（支持 GS 分隔符和括号格式）
 * @returns 解析并验证后的 GS1 数据
 * 
 * @example
 * ```typescript
 * // 括号格式
 * const result1 = parseGS1("(01)12345678901234(10)ABC123(17)250101");
 * 
 * // GS 分隔符格式（其中 \x1D 代表 GS 字符）
 * const result2 = parseGS1("0112345678901234\x1D10ABC123\x1D17250101");
 * 
 * console.log(result1.isValid); // true/false
 * console.log(result1.elements); // 解析出的元素
 * console.log(result1.groups.identification); // GTIN 等
 * console.log(result1.groups.dates); // 过期日期等
 * ```
 */
export function parseGS1(input: string): ParsedGS1Data {
  const parser = initializeParser();
  return parseGS1AutoStrict(input, parser);
}

/**
 * 简单的验证函数，检查 GS1 字符串是否有效
 * 
 * @param input - GS1 数据字符串
 * @returns 如果有效返回 true，否则返回 false
 * 
 * @example
 * ```typescript
 * const isValid = validateGS1("(01)12345678901234(10)ABC123");
 * console.log(isValid); // true/false
 * ```
 */
export function validateGS1(input: string): boolean {
  try {
    const result = parseGS1(input);
    return result.isValid;
  } catch (error) {
    return false;
  }
}

/**
 * 从 GS1 数据中提取特定的 AI 值
 * 
 * @param input - GS1 数据字符串
 * @param ai - 要提取的应用标识符（例如："01", "10", "17"）
 * @returns 指定 AI 的值，如果未找到则返回 null
 * 
 * @example
 * ```typescript
 * const gtin = extractAI("(01)12345678901234(10)ABC123", "01");
 * console.log(gtin); // "12345678901234"
 * 
 * const batchNumber = extractAI("(01)12345678901234(10)ABC123", "10");
 * console.log(batchNumber); // "ABC123"
 * ```
 */
export function extractAI(input: string, ai: string): string | null {
  try {
    const result = parseGS1(input);
    const element = result.elements.find(el => el.ai === ai);
    return element ? element.value : null;
  } catch (error) {
    return null;
  }
}

/**
 * 获取所有 AI 值作为简单的键值对象
 * 
 * @param input - GS1 数据字符串
 * @returns 以 AI 代码为键、值为字符串的对象
 * 
 * @example
 * ```typescript
 * const data = getAIValues("(01)12345678901234(10)ABC123(17)250101");
 * console.log(data);
 * // {
 * //   "01": "12345678901234",
 * //   "10": "ABC123", 
 * //   "17": "250101"
 * // }
 * ```
 */
export function getAIValues(input: string): Record<string, string> {
  try {
    const result = parseGS1(input);
    const values: Record<string, string> = {};
    
    result.elements.forEach(element => {
      values[element.ai] = element.value;
    });
    
    return values;
  } catch (error) {
    return {};
  }
}

/**
 * 获取 AI 代码的人类可读描述
 * 
 * @param ai - 应用标识符代码
 * @returns 人类可读的描述，如果未找到则返回 null
 * 
 * @example
 * ```typescript
 * const desc = getAIDescription("01");
 * console.log(desc); // "Global Trade Item Number (GTIN)"
 * ```
 */
export function getAIDescription(ai: string): string | null {
  try {
    const parser = initializeParser();
    const definition = parser.getAIDefinition(ai);
    return definition ? definition.description : null;
  } catch (error) {
    return null;
  }
}

/**
 * 通过描述或标题搜索 AI 定义
 * 
 * @param query - 搜索查询（不区分大小写）
 * @returns 匹配的 AI 定义数组，包含代码和描述
 * 
 * @example
 * ```typescript
 * const results = searchAI("date");
 * console.log(results);
 * // [
 * //   { ai: "11", description: "Production date", title: "PROD DATE" },
 * //   { ai: "15", description: "Best before date", title: "BEST BEFORE" },
 * //   ...
 * // ]
 * ```
 */
export function searchAI(query: string): Array<{ai: string, description: string, title: string}> {
  try {
    const parser = initializeParser();
    const definitions = parser.searchAIs(query);
    
    return definitions.map(def => ({
      ai: def.applicationIdentifier,
      description: def.description,
      title: def.title
    }));
  } catch (error) {
    return [];
  }
}

/**
 * 获取包含描述的格式化输出，便于阅读
 * 
 * @param input - GS1 数据字符串
 * @returns 格式化的 AI 信息数组
 * 
 * @example
 * ```typescript
 * const formatted = formatGS1("(01)12345678901234(10)ABC123");
 * console.log(formatted);
 * // [
 * //   {
 * //     ai: "01",
 * //     value: "12345678901234", 
 * //     description: "Global Trade Item Number (GTIN)",
 * //     isValid: true
 * //   },
 * //   {
 * //     ai: "10",
 * //     value: "ABC123",
 * //     description: "Batch or lot number", 
 * //     isValid: true
 * //   }
 * // ]
 * ```
 */
export function formatGS1(input: string): Array<{
  ai: string;
  value: string;
  description: string;
  isValid: boolean;
  validationError?: string;
}> {
  try {
    const result = parseGS1(input);
    
    return result.elements.map(element => ({
      ai: element.ai,
      value: element.value,
      description: element.definition.description,
      isValid: element.isValid,
      validationError: element.validationError
    }));
  } catch (error) {
    return [];
  }
}

/**
 * 检查输入是否包含有效的 GTIN（全球贸易项目代码）
 * 
 * @param input - GS1 数据字符串
 * @returns 如果找到且有效则返回 GTIN 值，否则返回 null
 */
export function extractGTIN(input: string): string | null {
  return extractAI(input, "01");
}

/**
 * 检查输入是否包含有效的批号/批次号
 * 
 * @param input - GS1 数据字符串
 * @returns 如果找到则返回批号，否则返回 null
 */
export function extractBatchNumber(input: string): string | null {
  return extractAI(input, "10");
}

/**
 * 从 GS1 数据中提取过期日期
 * 
 * @param input - GS1 数据字符串
 * @returns 如果找到则返回 YYMMDD 格式的过期日期，否则返回 null
 */
export function extractExpiryDate(input: string): string | null {
  // 按优先级顺序尝试不同的日期 AI
  const dateAIs = ["17", "15", "16"]; // 过期日期、最佳食用日期、销售截止日期
  
  for (const ai of dateAIs) {
    const date = extractAI(input, ai);
    if (date) {
      return date;
    }
  }
  
  return null;
}

/**
 * 将 YYMMDD 日期格式转换为 JavaScript Date 对象
 * 
 * @param yymmdd - YYMMDD 格式的日期（例如："250101" 表示 2025年1月1日）
 * @returns Date 对象，如果无效则返回 null
 */
export function parseGS1Date(yymmdd: string): Date | null {
  if (!yymmdd || yymmdd.length !== 6) {
    return null;
  }
  
  try {
    const yy = parseInt(yymmdd.substring(0, 2));
    const mm = parseInt(yymmdd.substring(2, 4));
    const dd = parseInt(yymmdd.substring(4, 6));
    
    // 假设年份 00-50 为 2000-2050，51-99 为 1951-1999
    const fullYear = yy <= 50 ? 2000 + yy : 1900 + yy;
    
    const date = new Date(fullYear, mm - 1, dd); // 月份是从 0 开始的
    
    // 验证日期
    if (date.getFullYear() === fullYear && 
        date.getMonth() === mm - 1 && 
        date.getDate() === dd) {
      return date;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// 导出类型供高级用法使用
export type {
  ParsedGS1Data,
  ParsedGS1Element,
  GS1ParserOptions,
  ValidationResult
} from './gs1parser';

// 导出解析器类，供需要更多控制的高级用户使用
export { GS1Parser, createGS1Parser } from './gs1parser';
