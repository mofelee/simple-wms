import { createFileRoute } from "@tanstack/react-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ScanBox } from "@/components/ScanBox";
import { getAIValues, parseGS1, parseGS1Date, validateGS1 } from "@/lib/gs1-parser";
import { parseDegreeFromApi } from "@/lib/degree";
import { usePrompt } from "@/components/ui/prompt";

type RecordItem = {
  // 扫码相关
  storeCode: string; // 店内编号
  udidRaw: string; // 原始UDID字符串
  udiDi: string; // 01 值

  // 输入与解析字段
  productNameInput: string; // 产品名称（输入框）
  deviceGeneralName: string; // 医疗器械的名称（产品名称/通用名称）
  modelSpec: string; // 规格型号
  degree: string; // 度数（自定义函数解析，暂时返回空）

  productionDate: string; // 生产日期（AI 11） YYYY-MM-DD
  expiryDate: string; // 失效日期（AI 17） YYYY-MM-DD
  batchNumber: string; // 批号（AI 10）
  serialNumber: string; // 序列号（AI 21）

  entryDate: string; // 入库日期（输入框）

  registrantName: string; // 注册/备案人名称
  registrationNo: string; // 注册/备案证号

  quantity: number; // 数量，总为 1
  purchaseUnitPrice: number; // 进货单价
  purchaseAmount: number; // 进货金额 = 单价 * 数量

  supplierName: string; // 供货者名称
  supplierAddress: string; // 供货者地址
  supplierContact: string; // 供货者联系方式

  purchaseDate: string; // 购货日期（输入框）
  acceptanceConclusion: string; // 验收结论（合格）
  acceptanceStaff: string; // 验收人员（输入框）
  acceptanceDate: string; // 验收日期（输入框）

  salePrice: number; // 销售价格（输入框）
  saleAmount: number; // 销售金额 = 销售价格 * 数量
  saleDate: string; // 销售日期（暂时为空）
  customerName: string; // 顾客姓名（导入保留，录入为空，不可编辑）
  customerPhone: string; // 顾客联系电话（导入保留，录入为空，不可编辑）
};

type TemplateForm = {
  productNameInput: string;
  entryDate: string;
  purchaseUnitPrice: string; // string 输入，内部转换为 number
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  purchaseDate: string;
  acceptanceStaff: string;
  acceptanceDate: string;
  salePrice: string; // string 输入，内部转换为 number
};

const CSV_HEADERS: string[] = [
  "店内编号",
  "UDID",
  "UDI-DI",
  "产品名称",
  "医疗器械的名称",
  "型号规格",
  "度数",
  "生产日期",
  "使用期限/失效日期",
  "批号",
  "序列号",
  "入库日期",
  "注册/备案人名称",
  "注册/备案证号",
  "数量",
  "进货单价",
  "进货金额",
  "供货者名称",
  "供货者地址",
  "供货者联系方式",
  "购货日期",
  "验收结论",
  "验收人员",
  "验收日期",
  "销售价格",
  "销售金额",
  "销售日期",
  "顾客姓名",
  "顾客联系电话",
];

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function yymmddToYYYYMMDD(yymmdd: string | null): string {
  if (!yymmdd) return "";
  const d = parseGS1Date(yymmdd);
  return d ? formatDateYYYYMMDD(d) : "";
}

function formatUdidToParentheses(raw: string): string {
  try {
    const parsed = parseGS1(raw);
    if (!parsed.isValid || parsed.elements.length === 0) {
      return raw.replace(/\x1D/g, "");
    }
    return parsed.elements.map((el) => `(${el.ai})${el.value}`).join("");
  } catch (_) {
    return raw.replace(/\x1D/g, "");
  }
}

function isLikelyStoreCode(data: string): boolean {
  // 纯数字，长度 10-14 之间；且不包含控制字符/括号
  return /^[0-9]{10,14}$/.test(data);
}

function isLikelyUDID(data: string): boolean {
  try {
    const valid = validateGS1(data);
    if (!valid) return false;
    const parsed = parseGS1(data);
    return parsed.isValid && parsed.elements.some((e) => e.ai === "01");
  } catch (_) {
    return false;
  }
}

// 由 src/lib/degree.ts 提供 parseDegreeFromApi

async function fetchDeviceInfoByUdiDi(udiDi: string): Promise<any | null> {
  try {
    const url = `https://udi.hemaoptical.com/devices-chinese?q=${encodeURIComponent(
      udiDi
    )}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data[0];
    }
    return null;
  } catch (e) {
    return null;
  }
}

export const Route = createFileRoute("/csvscanner")({
  component: RouteComponent,
});

function RouteComponent() {
  const prompt = usePrompt();
  
  const [template, setTemplate] = useState<TemplateForm>({
    productNameInput: "",
    entryDate: "",
    purchaseUnitPrice: "",
    supplierName: "",
    supplierAddress: "",
    supplierContact: "",
    purchaseDate: "",
    acceptanceStaff: "",
    acceptanceDate: "",
    salePrice: "",
  });

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [currentStoreCode, setCurrentStoreCode] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>("请先扫描店内码");
  const [loadingUdiInfo, setLoadingUdiInfo] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => formatDateYYYYMMDD(new Date()), []);

  const ensureRecordByStoreCode = useCallback(
    (storeCode: string): number => {
      const idx = records.findIndex((r) => r.storeCode === storeCode);
      if (idx !== -1) return idx;

      const quantity = 1;
      const purchaseUnitPrice = parseFloat(template.purchaseUnitPrice || "0") || 0;
      const salePrice = parseFloat(template.salePrice || "0") || 0;
      const newRecord: RecordItem = {
        storeCode,
        udidRaw: "",
        udiDi: "",
        productNameInput: template.productNameInput,
        deviceGeneralName: "",
        modelSpec: "",
        degree: "",
        productionDate: "",
        expiryDate: "",
        batchNumber: "",
        serialNumber: "",
        entryDate: template.entryDate,
        registrantName: "",
        registrationNo: "",
        quantity,
        purchaseUnitPrice,
        purchaseAmount: purchaseUnitPrice * quantity,
        supplierName: template.supplierName,
        supplierAddress: template.supplierAddress,
        supplierContact: template.supplierContact,
        purchaseDate: template.purchaseDate,
        acceptanceConclusion: "合格",
        acceptanceStaff: template.acceptanceStaff,
        acceptanceDate: template.acceptanceDate,
        salePrice,
        saleAmount: salePrice * quantity,
        saleDate: "",
        customerName: "",
        customerPhone: "",
      };

      setRecords((prev) => [...prev, newRecord]);
      return records.length; // 新记录索引（基于当前快照）
    },
    [records, template]
  );

  const updateRecordAt = useCallback((index: number, updater: (r: RecordItem) => RecordItem) => {
    setRecords((prev) => {
      const newRecords = prev.map((r, i) => {
        if (i === index) {
          const updated = updater(r);
          if (r.degree !== updated.degree) {
            console.log('🔍 Record degree updated:', { 
              index, 
              from: r.degree, 
              to: updated.degree 
            });
          }
          return updated;
        }
        return r;
      });
      return newRecords;
    });
  }, []);

  const handleScan = useCallback(
    async (result: { rawData: string }) => {
      const data = result.rawData.trim();
      if (!data) return;

      // 判断类型
      const store = isLikelyStoreCode(data);
      const udid = !store && isLikelyUDID(data);

      if (store) {
        // 店内码：创建或定位记录，提醒扫描UDID
        const idx = ensureRecordByStoreCode(data);
        setCurrentStoreCode(data);
        setStatusText("店内码已记录，请扫描UDID");
        return;
      }

      if (udid) {
        if (!currentStoreCode) {
          // 第一次就是UDID：忽略
          setStatusText("已忽略UDID，请先扫描店内码");
          return;
        }

        const idx = records.findIndex((r) => r.storeCode === currentStoreCode);
        if (idx === -1) {
          // 没有现有记录：直接创建并填充
          await createRecordWithUdid(currentStoreCode, data);
          setStatusText("UDID已解析，记录已创建并填充");
          return;
        }

        // 两次连续UDID：覆盖当前记录
        await applyUdidToRecord(idx, data);
        setStatusText("UDID已解析（覆盖当前记录）");
        return;
      }

      // 其他：不识别
      setStatusText("未识别的条码，请扫描店内码或UDID");
    },
    [currentStoreCode, ensureRecordByStoreCode, records]
  );

  const applyUdidToRecord = useCallback(
    async (index: number, udidRaw: string) => {
      const aiValues = getAIValues(udidRaw);
      const udiDi = aiValues["01"] || "";
      const prod = yymmddToYYYYMMDD(aiValues["11"] || null);
      const exp = yymmddToYYYYMMDD(aiValues["17"] || null);
      const batch = aiValues["10"] || "";
      const serial = aiValues["21"] || "";
      // 先填充 AI 字段（UDID 规范化为括号格式，过滤掉 \x1D）
      updateRecordAt(index, (r) => ({
        ...r,
        udidRaw: formatUdidToParentheses(udidRaw),
        udiDi: String(udiDi),
        productionDate: prod,
        expiryDate: exp,
        batchNumber: batch,
        serialNumber: serial,
      }));

      if (!udiDi) return; // 无01则不请求

      setLoadingUdiInfo(true);
      const info = await fetchDeviceInfoByUdiDi(udiDi);
      setLoadingUdiInfo(false);

      if (info) {
        const deviceGeneralName = info["产品名称/通用名称"] || "";
        const modelSpec = info["规格型号"] || "";
        const registrantName = info["注册/备案人名称"] || "";
        const registrationNo = info["注册/备案证号"] || "";
        const degreeFromApi = await parseDegreeFromApi(info, prompt);

        updateRecordAt(index, (r) => ({
          ...r,
          deviceGeneralName,
          modelSpec,
          registrantName,
          registrationNo,
          degree: degreeFromApi || r.degree,
        }));

        if (!degreeFromApi || degreeFromApi === "") {
          setStatusText("未能自动解析度数，请手动填写或调整解析规则");
        }
      }
    },
    [updateRecordAt, prompt]
  );

  const createRecordWithUdid = useCallback(
    async (storeCode: string, udidRaw: string) => {
      const aiValues = getAIValues(udidRaw);
      const udiDi = aiValues["01"] || "";
      const prod = yymmddToYYYYMMDD(aiValues["11"] || null);
      const exp = yymmddToYYYYMMDD(aiValues["17"] || null);
      const batch = aiValues["10"] || "";
      const serial = aiValues["21"] || "";
      let deviceGeneralName = "";
      let modelSpec = "";
      let registrantName = "";
      let registrationNo = "";
      let degreeFromApi: string = "";
      if (udiDi) {
        setLoadingUdiInfo(true);
        const info = await fetchDeviceInfoByUdiDi(udiDi);
        setLoadingUdiInfo(false);
        if (info) {
          deviceGeneralName = info["产品名称/通用名称"] || "";
          modelSpec = info["规格型号"] || "";
          registrantName = info["注册/备案人名称"] || "";
          registrationNo = info["注册/备案证号"] || "";
          degreeFromApi = await parseDegreeFromApi(info, prompt);
          if (!degreeFromApi || degreeFromApi === "") {
            setStatusText("未能自动解析度数，请手动填写或调整解析规则");
          }
        }
      }

      const quantity = 1;
      const purchaseUnitPrice = parseFloat(template.purchaseUnitPrice || "0") || 0;
      const salePrice = parseFloat(template.salePrice || "0") || 0;
      const newRecord: RecordItem = {
        storeCode,
        udidRaw: formatUdidToParentheses(udidRaw),
        udiDi: String(udiDi),
        productNameInput: template.productNameInput,
        deviceGeneralName,
        modelSpec,
        degree: degreeFromApi || "",
        productionDate: prod,
        expiryDate: exp,
        batchNumber: batch,
        serialNumber: serial,
        entryDate: template.entryDate,
        registrantName,
        registrationNo,
        quantity,
        purchaseUnitPrice,
        purchaseAmount: purchaseUnitPrice * quantity,
        supplierName: template.supplierName,
        supplierAddress: template.supplierAddress,
        supplierContact: template.supplierContact,
        purchaseDate: template.purchaseDate,
        acceptanceConclusion: "合格",
        acceptanceStaff: template.acceptanceStaff,
        acceptanceDate: template.acceptanceDate,
        salePrice,
        saleAmount: salePrice * quantity,
        saleDate: "",
        customerName: "",
        customerPhone: "",
      };

      setRecords((prev) => [...prev, newRecord]);
    },
    [template, prompt]
  );

  const handleExportCSV = useCallback(() => {
    const rows: string[][] = [];
    rows.push(CSV_HEADERS);
    for (const r of records) {
      rows.push([
        r.storeCode,
        r.udidRaw,
        r.udiDi,
        r.productNameInput,
        r.deviceGeneralName,
        r.modelSpec,
        r.degree,
        r.productionDate,
        r.expiryDate,
        r.batchNumber,
        r.serialNumber,
        r.entryDate,
        r.registrantName,
        r.registrationNo,
        String(r.quantity),
        String(r.purchaseUnitPrice),
        String(r.purchaseAmount),
        r.supplierName,
        r.supplierAddress,
        r.supplierContact,
        r.purchaseDate,
        r.acceptanceConclusion,
        r.acceptanceStaff,
        r.acceptanceDate,
        String(r.salePrice),
        String(r.saleAmount),
        r.saleDate,
        r.customerName,
        r.customerPhone,
      ]);
    }

    const escape = (val: string) => {
      const v = val ?? "";
      if (/[",\n]/.test(v)) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    };

    const csv = rows.map((r) => r.map((c) => escape(String(c))).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `records_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [records]);

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let i = 0;
    let cur: string[] = [];
    let field = "";
    let inQuotes = false;

    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          field += ch;
          i++;
          continue;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
          continue;
        }
        if (ch === ",") {
          cur.push(field);
          field = "";
          i++;
          continue;
        }
        if (ch === "\n") {
          cur.push(field);
          rows.push(cur);
          cur = [];
          field = "";
          i++;
          continue;
        }
        if (ch === "\r") {
          i++;
          continue;
        }
        field += ch;
        i++;
      }
    }
    // last field
    cur.push(field);
    rows.push(cur);
    return rows;
  };

  const handleImportCSVFile = useCallback(async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text).filter((r) => r.length > 1);
    if (rows.length === 0) return;
    const header = rows[0];
    const dataRows = rows.slice(1);
    const idx = (name: string) => header.indexOf(name);

    const newRecords: RecordItem[] = dataRows.map((cols) => {
      const get = (name: string) => (idx(name) >= 0 ? cols[idx(name)] ?? "" : "");
      const quantity = Number(get("数量")) || 1;
      const purchaseUnitPrice = Number(get("进货单价")) || 0;
      const salePrice = Number(get("销售价格")) || 0;
      return {
        storeCode: get("店内编号"),
        udidRaw: get("UDID"),
        udiDi: get("UDI-DI"),
        productNameInput: get("产品名称"),
        deviceGeneralName: get("医疗器械的名称"),
        modelSpec: get("型号规格"),
        degree: get("度数"),
        productionDate: get("生产日期"),
        expiryDate: get("使用期限/失效日期"),
        batchNumber: get("批号"),
        serialNumber: get("序列号"),
        entryDate: get("入库日期"),
        registrantName: get("注册/备案人名称"),
        registrationNo: get("注册/备案证号"),
        quantity,
        purchaseUnitPrice,
        purchaseAmount: Number(get("进货金额")) || purchaseUnitPrice * quantity,
        supplierName: get("供货者名称"),
        supplierAddress: get("供货者地址"),
        supplierContact: get("供货者联系方式"),
        purchaseDate: get("购货日期"),
        acceptanceConclusion: get("验收结论") || "合格",
        acceptanceStaff: get("验收人员"),
        acceptanceDate: get("验收日期"),
        salePrice,
        saleAmount: Number(get("销售金额")) || salePrice * quantity,
        saleDate: get("销售日期"),
        customerName: get("顾客姓名"),
        customerPhone: get("顾客联系电话"),
      } as RecordItem;
    });
    setRecords(newRecords);
    setStatusText("CSV已导入");
  }, []);

  const setTodayForTemplate = useCallback((key: keyof TemplateForm) => {
    setTemplate((t) => ({ ...t, [key]: todayStr }));
  }, [todayStr]);

  const setTodayForRecord = useCallback((index: number, key: keyof RecordItem) => {
    updateRecordAt(index, (r) => ({ ...r, [key]: todayStr } as RecordItem));
  }, [todayStr, updateRecordAt]);

  const onTemplateChange = (key: keyof TemplateForm, value: string) => {
    setTemplate((t) => ({ ...t, [key]: value }));
  };

  const onRecordChange = (index: number, key: keyof RecordItem, value: string) => {
    updateRecordAt(index, (r) => {
      const next: RecordItem = { ...r };
      if (key === "purchaseUnitPrice") {
        const v = parseFloat(value || "0") || 0;
        next.purchaseUnitPrice = v;
        next.purchaseAmount = v * (next.quantity || 1);
      } else if (key === "salePrice") {
        const v = parseFloat(value || "0") || 0;
        next.salePrice = v;
        next.saleAmount = v * (next.quantity || 1);
      } else if (key === "quantity") {
        const v = parseInt(value || "1");
        next.quantity = Number.isFinite(v) && v > 0 ? v : 1;
        next.purchaseAmount = next.purchaseUnitPrice * next.quantity;
        next.saleAmount = next.salePrice * next.quantity;
      } else {
        // @ts-expect-error index write
        next[key] = value as any;
      }
      return next;
    });
  };

  const removeRecord = (index: number) => {
    setRecords((prev) => prev.filter((_, i) => i !== index));
    setStatusText("记录已删除");
  };

  const fillTemplateFromRecord = useCallback((record: RecordItem) => {
    setTemplate({
      productNameInput: record.productNameInput || "",
      entryDate: record.entryDate || "",
      purchaseUnitPrice: record.purchaseUnitPrice != null ? String(record.purchaseUnitPrice) : "",
      supplierName: record.supplierName || "",
      supplierAddress: record.supplierAddress || "",
      supplierContact: record.supplierContact || "",
      purchaseDate: record.purchaseDate || "",
      acceptanceStaff: record.acceptanceStaff || "",
      acceptanceDate: record.acceptanceDate || "",
      salePrice: record.salePrice != null ? String(record.salePrice) : "",
    });
    setStatusText("已从记录填充到模板");
  }, []);

  const placeholder = `当前状态：${statusText}`;

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <div className="text-lg font-semibold">扫码录入</div>
        <div className="text-sm text-gray-600">
          先扫描店内码，再扫描UDID；两次连续UDID将覆盖当前记录；首次扫描为UDID则忽略。
        </div>
      </div>

      <ScanBox
        onScan={handleScan}
        placeholder={placeholder}
        autoFocus={true}
        showStatus={true}
      />

      {loadingUdiInfo && (
        <div className="text-sm text-blue-600">正在获取UDI-DI详情...</div>
      )}

      <section className="space-y-3">
        <div className="text-lg font-semibold">模板输入（新店内码创建记录时将复制此处内容）</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-600">产品名称</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={template.productNameInput}
              onChange={(e) => onTemplateChange("productNameInput", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 flex items-center justify-between">
              <span>入库日期</span>
              <button className="text-blue-600 text-xs" onClick={() => setTodayForTemplate("entryDate")}>设为今天</button>
            </label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={template.entryDate}
              onChange={(e) => onTemplateChange("entryDate", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">进货单价</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-2 py-1"
              value={template.purchaseUnitPrice}
              onChange={(e) => onTemplateChange("purchaseUnitPrice", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">供货者名称</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={template.supplierName}
              onChange={(e) => onTemplateChange("supplierName", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">供货者地址</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={template.supplierAddress}
              onChange={(e) => onTemplateChange("supplierAddress", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">供货者联系方式</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={template.supplierContact}
              onChange={(e) => onTemplateChange("supplierContact", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 flex items-center justify-between">
              <span>购货日期</span>
              <button className="text-blue-600 text-xs" onClick={() => setTodayForTemplate("purchaseDate")}>设为今天</button>
            </label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={template.purchaseDate}
              onChange={(e) => onTemplateChange("purchaseDate", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">验收人员</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={template.acceptanceStaff}
              onChange={(e) => onTemplateChange("acceptanceStaff", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 flex items-center justify-between">
              <span>验收日期</span>
              <button className="text-blue-600 text-xs" onClick={() => setTodayForTemplate("acceptanceDate")}>设为今天</button>
            </label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={template.acceptanceDate}
              onChange={(e) => onTemplateChange("acceptanceDate", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">销售价格</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-2 py-1"
              value={template.salePrice}
              onChange={(e) => onTemplateChange("salePrice", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">记录列表（CSV）</div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white"
              onClick={handleExportCSV}
            >
              导出CSV
            </button>
            <button
              className="px-3 py-1 rounded bg-gray-700 text-white"
              onClick={() => fileInputRef.current?.click()}
            >
              导入CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportCSVFile(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <div className="overflow-auto border rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {CSV_HEADERS.concat(["操作"]).map((h) => (
                  <th key={h} className="px-1 py-1 text-left border-b whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={r.storeCode} className="odd:bg-white even:bg-gray-50">
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.storeCode}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.udidRaw}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">
                    <a href={`https://udi.hemaoptical.com/devices-chinese?q=${r.udiDi}`} target="_blank" rel="noopener noreferrer">
                      {r.udiDi}
                    </a>
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">
                    <input className="w-40 border rounded px-2 py-1" value={r.productNameInput}
                      onChange={(e) => onRecordChange(idx, "productNameInput", e.target.value)} />
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.deviceGeneralName}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.modelSpec}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">
                    <input className="w-28 border rounded px-2 py-1" value={r.degree}
                      onChange={(e) => onRecordChange(idx, "degree", e.target.value)} />
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.productionDate}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.expiryDate}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.batchNumber}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.serialNumber}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <input type="date" className="w-36 border rounded px-2 py-1" value={r.entryDate}
                        onChange={(e) => onRecordChange(idx, "entryDate", e.target.value)} />
                      <button className="text-blue-600 text-xs" onClick={() => setTodayForRecord(idx, "entryDate")}>今天</button>
                    </div>
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.registrantName}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.registrationNo}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap w-16">1</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap w-24">
                    <input type="number" step="0.01" className="w-24 border rounded px-2 py-1" value={r.purchaseUnitPrice}
                      onChange={(e) => onRecordChange(idx, "purchaseUnitPrice", e.target.value)} />
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.purchaseAmount.toFixed(2)}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap w-40">
                    <input className="w-40 border rounded px-2 py-1" value={r.supplierName}
                      onChange={(e) => onRecordChange(idx, "supplierName", e.target.value)} />
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap w-52">
                    <input className="w-52 border rounded px-2 py-1" value={r.supplierAddress}
                      onChange={(e) => onRecordChange(idx, "supplierAddress", e.target.value)} />
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap w-40">
                    <input className="w-40 border rounded px-2 py-1" value={r.supplierContact}
                      onChange={(e) => onRecordChange(idx, "supplierContact", e.target.value)} />
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <input type="date" className="w-36 border rounded px-2 py-1" value={r.purchaseDate}
                        onChange={(e) => onRecordChange(idx, "purchaseDate", e.target.value)} />
                      <button className="text-blue-600 text-xs" onClick={() => setTodayForRecord(idx, "purchaseDate")}>今天</button>
                    </div>
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.acceptanceConclusion}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap w-32">
                    <input className="w-32 border rounded px-2 py-1" value={r.acceptanceStaff}
                      onChange={(e) => onRecordChange(idx, "acceptanceStaff", e.target.value)} />
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <input type="date" className="w-36 border rounded px-2 py-1" value={r.acceptanceDate}
                        onChange={(e) => onRecordChange(idx, "acceptanceDate", e.target.value)} />
                      <button className="text-blue-600 text-xs" onClick={() => setTodayForRecord(idx, "acceptanceDate")}>今天</button>
                    </div>
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap w-24">
                    <input type="number" step="0.01" className="w-24 border rounded px-2 py-1" value={r.salePrice}
                      onChange={(e) => onRecordChange(idx, "salePrice", e.target.value)} />
                  </td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.saleAmount.toFixed(2)}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.saleDate}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.customerName}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">{r.customerPhone}</td>
                  <td className="px-1 py-1 border-b whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button className="px-2 py-1 rounded bg-gray-600 text-white" onClick={() => fillTemplateFromRecord(r)}>填充模板</button>
                      <button className="px-2 py-1 rounded bg-red-600 text-white" onClick={() => removeRecord(idx)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td className="px-1 py-3 text-center text-gray-500" colSpan={CSV_HEADERS.length + 1}>
                    暂无记录，请先扫描店内码
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
