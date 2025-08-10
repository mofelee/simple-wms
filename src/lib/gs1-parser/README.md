# GS1 解析器

一个用于解析和验证 GS1 条码数据的 TypeScript 库。支持自动格式检测、数据验证和便捷的信息提取。

## 功能特性

- 🔍 **自动格式检测** - 支持括号格式 `(AI)value` 和 GS 分隔符格式
- ✅ **数据验证** - 基于官方 GS1 词汇表进行严格验证
- 📊 **信息分组** - 自动将 AI 按类别分组（标识、日期、测量、物流等）
- 🛠️ **便捷接口** - 简化的 API，无需复杂配置
- 🌍 **完整支持** - 支持所有标准 GS1 应用标识符（AI）

## 快速开始

### 基本用法

```typescript
import { parseGS1, extractGTIN, extractBatchNumber } from '@/lib/gs1-parser';

// 解析 GS1 数据
const result = parseGS1("(01)12345678901234(10)ABC123(17)250101");

console.log(result.isValid); // true
console.log(result.elements); // 解析出的所有元素
console.log(result.groups.identification); // GTIN 等标识信息
console.log(result.groups.dates); // 日期信息
```

### 快速提取信息

```typescript
// 提取 GTIN（全球贸易项目代码）
const gtin = extractGTIN("(01)12345678901234(10)ABC123");
console.log(gtin); // "12345678901234"

// 提取批号
const batch = extractBatchNumber("(01)12345678901234(10)ABC123");
console.log(batch); // "ABC123"

// 提取过期日期
const expiry = extractExpiryDate("(01)12345678901234(17)250101");
console.log(expiry); // "250101"
```

## API 参考

### 核心函数

#### `parseGS1(input: string): ParsedGS1Data`
自动检测格式并解析 GS1 数据字符串。

**参数：**
- `input` - GS1 数据字符串（支持括号格式和 GS 分隔符格式）

**返回：**
```typescript
{
  isValid: boolean;        // 是否有效
  elements: ParsedGS1Element[];  // 解析出的元素
  errors: string[];        // 错误信息
  groups: {               // 按类别分组的元素
    identification: ParsedGS1Element[];
    dates: ParsedGS1Element[];
    measurements: ParsedGS1Element[];
    logistics: ParsedGS1Element[];
    other: ParsedGS1Element[];
  };
  primaryKey?: ParsedGS1Element;  // 主键（通常是 GTIN）
}
```

#### `validateGS1(input: string): boolean`
简单验证 GS1 字符串是否有效。

#### `extractAI(input: string, ai: string): string | null`
提取指定 AI 的值。

**常用 AI 代码：**
- `"01"` - GTIN（全球贸易项目代码）
- `"10"` - 批号/批次号
- `"17"` - 过期日期
- `"15"` - 最佳食用日期
- `"11"` - 生产日期

### 便捷函数

#### `getAIValues(input: string): Record<string, string>`
获取所有 AI 值作为键值对象。

```typescript
const data = getAIValues("(01)12345678901234(10)ABC123(17)250101");
// 返回: { "01": "12345678901234", "10": "ABC123", "17": "250101" }
```

#### `formatGS1(input: string): Array<{ai: string, value: string, description: string, isValid: boolean}>`
获取格式化的输出，包含人类可读的描述。

#### `extractGTIN(input: string): string | null`
提取 GTIN（全球贸易项目代码）。

#### `extractBatchNumber(input: string): string | null`
提取批号/批次号。

#### `extractExpiryDate(input: string): string | null`
提取过期日期（优先级：过期日期 > 最佳食用日期 > 销售截止日期）。

#### `parseGS1Date(yymmdd: string): Date | null`
将 YYMMDD 格式转换为 JavaScript Date 对象。

### 工具函数

#### `getAIDescription(ai: string): string | null`
获取 AI 代码的人类可读描述。

#### `searchAI(query: string): Array<{ai: string, description: string, title: string}>`
搜索 AI 定义。

```typescript
const results = searchAI("date");
// 返回所有与日期相关的 AI
```

## 支持的格式

### 括号格式
```
(01)12345678901234(10)ABC123(17)250101
```

### GS 分隔符格式
```
0112345678901234[GS]10ABC123[GS]17250101
```
*注：`[GS]` 代表 ASCII 字符 0x1D*

## 常见用例

### 验证条码数据
```typescript
const isValid = validateGS1(scannedBarcode);
if (isValid) {
  console.log("条码数据有效");
} else {
  console.log("条码数据无效");
}
```

### 提取产品信息
```typescript
const barcode = "(01)12345678901234(10)LOT001(17)251231";

const productInfo = {
  gtin: extractGTIN(barcode),
  batchNumber: extractBatchNumber(barcode),
  expiryDate: extractExpiryDate(barcode)
};

console.log(productInfo);
// { gtin: "12345678901234", batchNumber: "LOT001", expiryDate: "251231" }
```

### 完整解析和分析
```typescript
const result = parseGS1(barcode);

if (result.isValid) {
  console.log("主键（GTIN）:", result.primaryKey?.value);
  console.log("标识信息:", result.groups.identification);
  console.log("日期信息:", result.groups.dates);
  console.log("所有元素:", result.elements);
} else {
  console.log("解析错误:", result.errors);
}
```

### 日期处理
```typescript
const expiryDate = extractExpiryDate(barcode);
if (expiryDate) {
  const date = parseGS1Date(expiryDate);
  console.log("过期日期:", date?.toLocaleDateString('zh-CN'));
}
```

## 文件结构

```
src/lib/gs1-parser/
├── index.ts          # 主要 API 接口
├── gs1parser.ts      # 核心解析器实现
├── gs1_ai.json       # GS1 官方词汇表数据
├── translate.csv     # 多语言翻译表
└── README.md         # 本文档
```

## 注意事项

1. **日期格式**：所有日期都使用 YYMMDD 格式，年份 00-50 表示 2000-2050，51-99 表示 1951-1999
2. **验证严格性**：默认启用严格验证，包括格式检查、长度验证和依赖关系检查
3. **错误处理**：所有函数都包含错误处理，无效输入会返回 `null` 或空数组
4. **性能**：解析器会缓存配置，多次调用性能良好

## 许可证

基于项目许可证。GS1 词汇表数据来自 GS1 官方，遵循相应的使用条款。
