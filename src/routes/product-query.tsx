import { createFileRoute } from "@tanstack/react-router";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { ScanBox } from "@/components/ScanBox";
import { usePrompt } from "@/components/ui/prompt";
import { EscPosBuilder } from "@/lib/escpos";
import { Eye, EyeOff, Printer, Settings, Save, FolderOpen, CheckCircle } from "lucide-react";

type ProductRecord = {
  // 扫码相关
  storeCode: string; // 店内编号
  udidRaw: string; // 原始UDID字符串
  udiDi: string; // UDI-DI

  // 产品信息
  productNameInput: string; // 产品名称
  deviceGeneralName: string; // 医疗器械的名称
  modelSpec: string; // 规格型号
  degree: string; // 度数
  
  productionDate: string; // 生产日期 YYYY-MM-DD
  expiryDate: string; // 失效日期 YYYY-MM-DD
  batchNumber: string; // 批号
  serialNumber: string; // 序列号
  
  entryDate: string; // 入库日期
  
  registrantName: string; // 注册/备案人名称
  registrationNo: string; // 注册/备案证号
  
  quantity: number; // 数量
  purchaseUnitPrice: number; // 进货单价
  purchaseAmount: number; // 进货金额
  
  supplierName: string; // 供货者名称
  supplierAddress: string; // 供货者地址
  supplierContact: string; // 供货者联系方式
  
  purchaseDate: string; // 购货日期
  acceptanceConclusion: string; // 验收结论
  acceptanceStaff: string; // 验收人员
  acceptanceDate: string; // 验收日期
  
  salePrice: number; // 销售价格
  saleAmount: number; // 销售金额
  saleDate: string; // 销售日期
  customerName: string; // 顾客姓名
  customerPhone: string; // 顾客联系电话
};

type StoreConfig = {
  csvFilePath: string; // CSV文件位置
  retailUnitName: string; // 零售单位名称
  businessAddress: string; // 经营地址
  phoneNumber: string; // 电话
};

const CSV_HEADERS: string[] = [
  "店内编号", "UDID", "UDI-DI", "产品名称", "医疗器械的名称", "型号规格",
  "度数", "生产日期", "使用期限/失效日期", "批号", "序列号", "入库日期",
  "注册/备案人名称", "注册/备案证号", "数量", "进货单价", "进货金额",
  "供货者名称", "供货者地址", "供货者联系方式", "购货日期", "验收结论",
  "验收人员", "验收日期", "销售价格", "销售金额", "销售日期", "顾客姓名", "顾客联系电话"
];

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatValidityPeriod(productionDate: string, expiryDate: string): string {
  if (!productionDate || !expiryDate) return "";
  return `${productionDate}到${expiryDate}`;
}

export const Route = createFileRoute("/product-query")({
  component: RouteComponent,
});

function RouteComponent() {
  const prompt = usePrompt();
  
  const [csvData, setCsvData] = useState<ProductRecord[]>([]);
  const [currentProduct, setCurrentProduct] = useState<ProductRecord | null>(null);
  const [showCostPrices, setShowCostPrices] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("请扫描店内编号查询产品");
  
  // 销售信息输入
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [saleDate, setSaleDate] = useState<string>(formatDateYYYYMMDD(new Date()));
  
  // 配置信息
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    csvFilePath: "",
    retailUnitName: "",
    businessAddress: "",
    phoneNumber: ""
  });
  
  // 配置弹窗状态
  const [showConfigDialog, setShowConfigDialog] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState<StoreConfig>({
    csvFilePath: "",
    retailUnitName: "",
    businessAddress: "",
    phoneNumber: ""
  });
  
  const todayStr = useMemo(() => formatDateYYYYMMDD(new Date()), []);

  // 解析CSV行数据
  const parseCSVRow = useCallback((cols: string[]): ProductRecord | null => {
    const get = (name: string) => {
      const index = CSV_HEADERS.indexOf(name);
      return index >= 0 ? (cols[index] ?? "") : "";
    };
    
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
    };
  }, []);

  // 解析CSV文本
  const parseCSV = useCallback((text: string): string[][] => {
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
  }, []);

  // 加载CSV数据
  const loadCsvData = useCallback(async () => {
    try {
      if (!storeConfig.csvFilePath.trim()) {
        setStatusText("请先在配置中设置CSV文件路径");
        setCsvData([]);
        return;
      }

      // 检查 Electron API 是否可用
      if (!window.electronAPI || !window.electronAPI.file) {
        setStatusText("文件系统API不可用，请在Electron环境中运行");
        return;
      }

      // 先检查文件访问权限（包含macOS权限检查）
      try {
        const checkRes = await window.electronAPI.productQuery.checkCsvFile({ filePath: storeConfig.csvFilePath });
        if (!checkRes.success) {
          setStatusText(`文件访问检查失败: ${checkRes.error || '未知错误'}`);
          setCsvData([]);
          return;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '文件权限检查失败';
        setStatusText(`权限检查失败: ${errorMsg}`);
        setCsvData([]);
        return;
      }

      // 读取文件内容
      const readRes = await window.electronAPI.file.read(storeConfig.csvFilePath, 'utf8');
      if (!readRes.success || !readRes.data) {
        const errorMsg = readRes.error || '未知错误';
        console.error('读取CSV文件失败:', errorMsg);
        setStatusText(`读取CSV文件失败: ${errorMsg}`);
        setCsvData([]);
        return;
      }

      const csvText = readRes.data;
      const rows = parseCSV(csvText).filter((r) => r.length > 1);
      
      if (rows.length === 0) {
        setStatusText("CSV文件中没有有效数据");
        setCsvData([]);
        return;
      }
      
      const header = rows[0];
      const dataRows = rows.slice(1);
      
      // 验证CSV格式
      const expectedHeaders = CSV_HEADERS;
      const hasValidFormat = expectedHeaders.every(h => header.includes(h));
      
      if (!hasValidFormat) {
        setStatusText("CSV文件格式不匹配，请检查文件格式是否包含所需字段");
        setCsvData([]);
        return;
      }
      
      // 解析数据行
      const records: ProductRecord[] = dataRows.map((cols) => {
        const record = parseCSVRow(cols);
        return record;
      }).filter(Boolean) as ProductRecord[];
      
      setCsvData(records);
      setStatusText(`CSV数据已加载，共 ${records.length} 条记录 (${storeConfig.csvFilePath})`);
      
    } catch (error) {
      setStatusText("加载CSV数据失败");
      console.error("Failed to load CSV data:", error);
      setCsvData([]);
    }
  }, [storeConfig.csvFilePath, parseCSV, parseCSVRow]);

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      // 检查 Electron API 是否可用
      if (!window.electronAPI || !window.electronAPI.productQuery) {
        setStatusText("产品查询API不可用，请在Electron环境中运行");
        return;
      }

      // 从应用数据目录加载配置
      const res = await window.electronAPI.productQuery.getConfig();
      if (res.success && res.data) {
        setStoreConfig(res.data);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  }, []);

  // 保存配置
  const saveConfig = useCallback(async (config: StoreConfig) => {
    try {
      // 检查 Electron API 是否可用
      if (!window.electronAPI || !window.electronAPI.productQuery) {
        throw new Error('产品查询API不可用，请在Electron环境中运行');
      }

      // 保存到应用数据目录
      const res = await window.electronAPI.productQuery.setConfig(config);
      if (!res.success) {
        throw new Error(res.error || '保存配置失败');
      }
      
      setStoreConfig(config);
      setStatusText("配置已保存到应用数据目录");
    } catch (error) {
      console.error("Failed to save config:", error);
      setStatusText("保存配置失败");
      throw error;
    }
  }, []);

  // 打开配置弹窗
  const handleOpenConfig = useCallback(() => {
    setConfigForm({ ...storeConfig });
    setShowConfigDialog(true);
  }, [storeConfig]);

  // 保存配置弹窗
  const handleSaveConfig = useCallback(async () => {
    try {
      // 验证必填字段
      if (!configForm.retailUnitName.trim()) {
        await prompt({
          title: "提示",
          description: "请填写零售单位名称",
          showInput: false,
        });
        return;
      }
      
      if (!configForm.businessAddress.trim()) {
        await prompt({
          title: "提示", 
          description: "请填写经营地址",
          showInput: false,
        });
        return;
      }
      
      if (!configForm.phoneNumber.trim()) {
        await prompt({
          title: "提示",
          description: "请填写联系电话",
          showInput: false,
        });
        return;
      }

      await saveConfig(configForm);
      setShowConfigDialog(false);
      
      await prompt({
        title: "成功",
        description: "配置保存成功！",
        showInput: false,
      });
    } catch (error) {
      console.error("Failed to save config:", error);
      await prompt({
        title: "错误",
        description: "保存配置失败",
        showInput: false,
      });
    }
  }, [configForm, saveConfig, prompt]);

  // 选择CSV文件
  const handleSelectCsvFile = useCallback(async () => {
    try {
      // 检查 Electron API 是否可用
      if (!window.electronAPI || !window.electronAPI.productQuery) {
        await prompt({
          title: "错误",
          description: "产品查询API不可用，请在Electron环境中运行",
          showInput: false,
        });
        return;
      }

      const res = await window.electronAPI.productQuery.selectCsvFile();
      if (res.success && res.data) {
        setConfigForm(prev => ({ ...prev, csvFilePath: res.data || "" }));
      } else {
        console.error("Select file failed:", res.error);
      }
    } catch (error) {
      console.error("Failed to select file:", error);
    }
  }, [prompt]);

  // 重新选择CSV文件
  const handleReselectCsvFile = useCallback(async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.productQuery) {
        await prompt({
          title: "错误",
          description: "产品查询API不可用，请在Electron环境中运行",
          showInput: false,
        });
        return;
      }

      const oldPath = configForm.csvFilePath;
      const res = await window.electronAPI.productQuery.reselectCsvFile(oldPath);
      
      if (res.success && res.data) {
        setConfigForm(prev => ({ ...prev, csvFilePath: res.data || "" }));
        
        await prompt({
          title: "成功",
          description: "文件已重新选择，权限已更新",
          showInput: false,
        });
      } else {
        console.error("Reselect file failed:", res.error);
      }
    } catch (error) {
      console.error("Failed to reselect file:", error);
      await prompt({
        title: "重新选择失败",
        description: error instanceof Error ? error.message : "未知错误",
        showInput: false,
      });
    }
  }, [configForm.csvFilePath, prompt]);

  // 测试CSV文件连接
  const handleTestCsvConnection = useCallback(async () => {
    if (!configForm.csvFilePath.trim()) {
      await prompt({
        title: "提示",
        description: "请先设置CSV文件路径",
        showInput: false,
      });
      return;
    }

    try {
      // 检查 Electron API 是否可用
      if (!window.electronAPI || !window.electronAPI.productQuery) {
        await prompt({
          title: "错误", 
          description: "产品查询API不可用，请在Electron环境中运行",
          showInput: false,
        });
        return;
      }

      const res = await window.electronAPI.productQuery.checkCsvFile({ filePath: configForm.csvFilePath });
      
      if (res.success && res.data === true) {
        await prompt({
          title: "成功",
          description: "CSV文件连接成功！",
          showInput: false,
        });
      } else {
        // 显示详细的错误信息
        const errorMsg = res.error || "找不到指定的CSV文件，请检查路径是否正确";
        console.error("CSV文件检查失败:", errorMsg);
        
        // 如果是权限相关错误，提供重新选择文件的选项
        const isPermissionError = errorMsg.includes('权限') || errorMsg.includes('访问') || errorMsg.includes('书签');
        
        await prompt({
          title: "CSV文件检查失败",
          description: `${errorMsg}${isPermissionError ? '\n\n提示：如果是权限问题，可以点击"重新选择文件"来重新授权。' : ''}`,
          showInput: false,
        });
      }
    } catch (error) {
      console.error("Failed to test connection:", error);
      await prompt({
        title: "错误",
        description: "连接测试失败",
        showInput: false,
      });
    }
  }, [configForm.csvFilePath, prompt]);

  // 扫码处理
  const handleScan = useCallback(async (result: { rawData: string }) => {
    const storeCode = result.rawData.trim();
    if (!storeCode) return;

    // 查找产品记录
    const product = csvData.find(item => item.storeCode === storeCode);
    
    if (product) {
      setCurrentProduct(product);
      setStatusText(`找到产品：${product.deviceGeneralName || product.productNameInput}`);
      
      // 如果产品已有顾客信息，则填充到输入框（保持当前输入不被清空的逻辑）
      if (product.customerName && !customerName) {
        setCustomerName(product.customerName);
      }
      if (product.customerPhone && !customerPhone) {
        setCustomerPhone(product.customerPhone);
      }
      if (product.saleDate && product.saleDate !== saleDate) {
        // 如果产品有销售日期且与当前不同，提示用户
        setStatusText(`找到产品：${product.deviceGeneralName || product.productNameInput} (已于 ${product.saleDate} 销售)`);
      }
    } else {
      setCurrentProduct(null);
      setStatusText(`未找到店内编号为 ${storeCode} 的产品`);
    }
  }, [csvData, customerName, customerPhone, saleDate]);

  // 将数据转换为CSV格式
  const convertToCSV = useCallback((records: ProductRecord[]): string => {
    const rows: string[][] = [];
    rows.push(CSV_HEADERS);
    
    for (const record of records) {
      rows.push([
        record.storeCode,
        record.udidRaw,
        record.udiDi,
        record.productNameInput,
        record.deviceGeneralName,
        record.modelSpec,
        record.degree,
        record.productionDate,
        record.expiryDate,
        record.batchNumber,
        record.serialNumber,
        record.entryDate,
        record.registrantName,
        record.registrationNo,
        String(record.quantity),
        String(record.purchaseUnitPrice),
        String(record.purchaseAmount),
        record.supplierName,
        record.supplierAddress,
        record.supplierContact,
        record.purchaseDate,
        record.acceptanceConclusion,
        record.acceptanceStaff,
        record.acceptanceDate,
        String(record.salePrice),
        String(record.saleAmount),
        record.saleDate,
        record.customerName,
        record.customerPhone,
      ]);
    }

    const escape = (val: string) => {
      const v = val ?? "";
      if (/[",\n]/.test(v)) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    };

    return rows.map((row) => row.map((cell) => escape(String(cell))).join(",")).join("\n");
  }, []);

  // 保存销售信息
  const handleSaveSale = useCallback(async () => {
    if (!currentProduct) return;
    
    if (!saleDate) {
      await prompt({
        title: "提示",
        description: "请选择销售日期",
        showInput: false,
      });
      return;
    }

    if (!storeConfig.csvFilePath.trim()) {
      await prompt({
        title: "错误",
        description: "CSV文件路径未配置，无法保存数据",
        showInput: false,
      });
      return;
    }

    try {
      // 检查 Electron API 是否可用
      if (!window.electronAPI || !window.electronAPI.file) {
        await prompt({
          title: "错误",
          description: "文件系统API不可用，请在Electron环境中运行",
          showInput: false,
        });
        return;
      }

      const updatedProduct: ProductRecord = {
        ...currentProduct,
        saleDate,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        saleAmount: currentProduct.salePrice * currentProduct.quantity
      };

      // 先检查文件写入权限
      try {
        const checkRes = await window.electronAPI.productQuery.checkCsvFile({ filePath: storeConfig.csvFilePath });
        if (!checkRes.success) {
          throw new Error(`文件权限检查失败: ${checkRes.error || '未知错误'}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '权限检查失败';
        throw new Error(`写入权限验证失败: ${errorMsg}`);
      }

      // 更新CSV数据
      const updatedCsvData = csvData.map(item => 
        item.storeCode === currentProduct.storeCode ? updatedProduct : item
      );
      
      // 将更新的数据写入到实际的CSV文件
      const csvText = convertToCSV(updatedCsvData);
      const writeRes = await window.electronAPI.file.write(storeConfig.csvFilePath, csvText, 'utf8');
      
      if (!writeRes.success) {
        const errorMsg = writeRes.error || '写入CSV文件失败';
        console.error('写入CSV文件失败:', errorMsg);
        throw new Error(`写入CSV文件失败: ${errorMsg}`);
      }

      // 更新界面状态
      setCsvData(updatedCsvData);
      setCurrentProduct(updatedProduct);
      setStatusText("销售信息已保存并更新到CSV文件");

      await prompt({
        title: "成功",
        description: "销售信息已保存到CSV文件",
        showInput: false,
      });

    } catch (error) {
      console.error("Failed to save sale:", error);
      setStatusText("保存销售信息失败");
      await prompt({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        showInput: false,
      });
    }
  }, [currentProduct, customerName, customerPhone, saleDate, csvData, convertToCSV, storeConfig.csvFilePath, prompt]);

  // 打印功能
  const handlePrint = useCallback(async () => {
    if (!currentProduct) return;
    
    if (!storeConfig.businessAddress || !storeConfig.phoneNumber) {
      await prompt({
        title: "配置缺失",
        description: "请先配置经营地址和电话信息",
        showInput: false,
      });
      return;
    }

    const validityPeriod = formatValidityPeriod(currentProduct.productionDate, currentProduct.expiryDate);
    const amount = (currentProduct.salePrice * 1).toFixed(2);
    
    const builder = new EscPosBuilder();
    
    const receiptData = builder
      .addText(storeConfig.retailUnitName || "零售店", { 
        align: 'center', 
        fontSize: 'double_height', 
        bold: true 
      })
      .addLine()
      .addText("销售凭证", { align: 'center', fontSize: 'double_width', bold: true })
      .addLine()
      .addSeparator('-', 32)
      .addText(`角膜接触镜名称：${currentProduct.deviceGeneralName}`, { align: 'left' })
      .addLine()
      .addText(`规格型号：${currentProduct.modelSpec}`, { align: 'left' })
      .addLine()
      .addText(`生产企业名称：${currentProduct.registrantName}`, { align: 'left' })
      .addLine()
      .addText(`注册证号：${currentProduct.registrationNo}`, { align: 'left' })
      .addLine()
      .addText(`数量：1`, { align: 'left' })
      .addLine()
      .addText(`单价：￥${currentProduct.salePrice.toFixed(2)}`, { align: 'left' })
      .addLine()
      .addText(`金额：￥${amount}`, { align: 'left', bold: true })
      .addLine()
      .addText(`批号：${currentProduct.batchNumber}`, { align: 'left' })
      .addLine()
      .addText(`序列号：${currentProduct.serialNumber}`, { align: 'left' })
      .addLine()
      .addText(`有效期：${validityPeriod}`, { align: 'left' })
      .addLine()
      .addSeparator('-', 32)
      .addText(`经营地址：${storeConfig.businessAddress}`, { align: 'left' })
      .addLine()
      .addText(`电话：${storeConfig.phoneNumber}`, { align: 'left' })
      .addLine()
      .addText(`销售日期：${saleDate}`, { align: 'left' })
      .addLine()
      .addSeparator('-', 32)
      .addText("谢谢惠顾！", { align: 'center', bold: true })
      .addEmptyLine(6)
      .cut()
      .build();

    try {
      // 检查 Electron API 是否可用
      if (!window.electronAPI || !window.electronAPI.printer) {
        await prompt({
          title: "错误",
          description: "打印机API不可用，请在Electron环境中运行",
          showInput: false,
        });
        return;
      }

      // 使用打印机配置进行ESC/POS打印
      const description = `销售凭证 - ${currentProduct.deviceGeneralName} - ￥${amount}`;
      const res = await window.electronAPI.printer.testPrint(receiptData, description);
      
      if (res.success) {
        setStatusText("打印成功！");
        await prompt({
          title: "成功",
          description: "销售凭证已发送到打印机",
          showInput: false,
        });
      } else {
        throw new Error(res.error || '打印失败');
      }
    } catch (error) {
      console.error("Print failed:", error);
      setStatusText("打印失败");
      await prompt({
        title: "打印失败",
        description: error instanceof Error ? error.message : "未知错误",
        showInput: false,
      });
    }
  }, [currentProduct, storeConfig, saleDate, prompt]);

  // 初始化
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    // 配置加载后，如果有CSV文件路径则加载数据
    if (storeConfig.csvFilePath.trim()) {
      loadCsvData();
    }
  }, [storeConfig.csvFilePath, loadCsvData]);

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* 标题和配置按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">产品查询</h1>
        <button
          onClick={handleOpenConfig}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
          配置
        </button>
      </div>

      {/* 扫码区域 */}
      <section className="space-y-3">
        <div className="text-lg font-semibold">产品查询</div>
        <div className="text-sm text-gray-600">
          使用扫码枪扫描产品的店内编号查询产品详细信息。支持查询库存产品，录入销售信息，打印销售凭证。
        </div>
        
        {csvData.length > 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-green-800">
              数据状态：已从CSV文件加载 {csvData.length} 条产品记录
            </div>
            <div className="text-xs text-green-600 mt-1">
              文件路径：{storeConfig.csvFilePath}
            </div>
          </div>
        ) : !storeConfig.csvFilePath.trim() ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-yellow-800">
              请先配置CSV文件路径
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              点击右上角的"配置"按钮，设置CSV数据文件路径
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-red-800">
              CSV文件加载失败
            </div>
            <div className="text-xs text-red-600 mt-1">
              请检查文件路径是否正确，或文件是否存在
            </div>
          </div>
        )}
        
        <ScanBox
          onScan={handleScan}
          placeholder={statusText}
          autoFocus={true}
          showStatus={true}
        />
      </section>

      {/* 产品信息显示 */}
      {currentProduct && (
        <section className={`space-y-4 border rounded-lg p-4 ${
          currentProduct.saleDate ? 'bg-green-50 border-green-200' : 'bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">产品信息</h2>
              {currentProduct.saleDate && (
                <span className="px-2 py-1 text-xs bg-green-500 text-white rounded-full">
                  已销售 ({currentProduct.saleDate})
                </span>
              )}
            </div>
            <button
              onClick={() => setShowCostPrices(!showCostPrices)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {showCostPrices ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showCostPrices ? "隐藏成本" : "显示成本"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="text-gray-600">店内编号</label>
              <div className="font-medium">{currentProduct.storeCode}</div>
            </div>
            
            <div>
              <label className="text-gray-600">UDID</label>
              <div className="font-medium font-mono text-xs break-all">{currentProduct.udidRaw}</div>
            </div>
            
            <div>
              <label className="text-gray-600">UDI-DI</label>
              <div>
                {currentProduct.udiDi ? (
                  <a 
                    href={`https://udi.hemaoptical.com/devices-chinese?q=${currentProduct.udiDi}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-mono text-xs break-all"
                  >
                    {currentProduct.udiDi}
                  </a>
                ) : (
                  <span className="text-gray-400">未设置</span>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-gray-600">产品名称</label>
              <div className="font-medium">{currentProduct.productNameInput}</div>
            </div>
            
            <div>
              <label className="text-gray-600">医疗器械的名称</label>
              <div className="font-medium">{currentProduct.deviceGeneralName}</div>
            </div>
            
            <div>
              <label className="text-gray-600">型号规格</label>
              <div className="font-medium">{currentProduct.modelSpec}</div>
            </div>
            
            <div>
              <label className="text-gray-600">度数</label>
              <div className="font-medium">{currentProduct.degree}</div>
            </div>
            
            <div>
              <label className="text-gray-600">生产日期</label>
              <div className="font-medium">{currentProduct.productionDate}</div>
            </div>
            
            <div>
              <label className="text-gray-600">使用期限/失效日期</label>
              <div className="font-medium">{currentProduct.expiryDate}</div>
            </div>
            
            <div>
              <label className="text-gray-600">批号</label>
              <div className="font-medium">{currentProduct.batchNumber}</div>
            </div>
            
            <div>
              <label className="text-gray-600">序列号</label>
              <div className="font-medium">{currentProduct.serialNumber}</div>
            </div>
            
            <div>
              <label className="text-gray-600">入库日期</label>
              <div className="font-medium">{currentProduct.entryDate}</div>
            </div>
            
            <div>
              <label className="text-gray-600">注册/备案人名称</label>
              <div className="font-medium">{currentProduct.registrantName}</div>
            </div>
            
            <div>
              <label className="text-gray-600">注册/备案证号</label>
              <div className="font-medium">{currentProduct.registrationNo}</div>
            </div>
            
            <div>
              <label className="text-gray-600">数量</label>
              <div className="font-medium">{currentProduct.quantity}</div>
            </div>
            
            {/* 成本价格信息（可隐藏） */}
            {showCostPrices && (
              <>
                <div>
                  <label className="text-gray-600">进货单价</label>
                  <div className="font-medium text-red-600">¥{currentProduct.purchaseUnitPrice.toFixed(2)}</div>
                </div>
                
                <div>
                  <label className="text-gray-600">进货金额</label>
                  <div className="font-medium text-red-600">¥{currentProduct.purchaseAmount.toFixed(2)}</div>
                </div>
              </>
            )}
            
            <div>
              <label className="text-gray-600">供货者名称</label>
              <div className="font-medium">{currentProduct.supplierName}</div>
            </div>
            
            <div>
              <label className="text-gray-600">供货者地址</label>
              <div className="font-medium">{currentProduct.supplierAddress}</div>
            </div>
            
            <div>
              <label className="text-gray-600">供货者联系方式</label>
              <div className="font-medium">{currentProduct.supplierContact}</div>
            </div>
            
            <div>
              <label className="text-gray-600">购货日期</label>
              <div className="font-medium">{currentProduct.purchaseDate}</div>
            </div>
            
            <div>
              <label className="text-gray-600">验收结论</label>
              <div className="font-medium">{currentProduct.acceptanceConclusion}</div>
            </div>
            
            <div>
              <label className="text-gray-600">验收人员</label>
              <div className="font-medium">{currentProduct.acceptanceStaff}</div>
            </div>
            
            <div>
              <label className="text-gray-600">验收日期</label>
              <div className="font-medium">{currentProduct.acceptanceDate}</div>
            </div>
            
            <div>
              <label className="text-gray-600">销售价格</label>
              <div className="font-medium text-green-600">¥{currentProduct.salePrice.toFixed(2)}</div>
            </div>
            
            <div>
              <label className="text-gray-600">销售金额</label>
              <div className="font-medium text-green-600">¥{currentProduct.saleAmount.toFixed(2)}</div>
            </div>
            
            <div>
              <label className="text-gray-600">销售日期</label>
              <div className="font-medium">{currentProduct.saleDate || "未销售"}</div>
            </div>
            
            <div>
              <label className="text-gray-600">顾客姓名</label>
              <div className="font-medium">{currentProduct.customerName || "未填写"}</div>
            </div>
            
            <div>
              <label className="text-gray-600">顾客联系电话</label>
              <div className="font-medium">{currentProduct.customerPhone || "未填写"}</div>
            </div>
          </div>
        </section>
      )}

      {/* 销售信息输入 */}
      {currentProduct && (
        <section className={`space-y-4 border rounded-lg p-4 ${
          currentProduct.saleDate ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50'
        }`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">销售信息录入</h2>
            {currentProduct.saleDate && (
              <span className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                此产品已销售，可重新录入
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                顾客姓名（选填）
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="请输入顾客姓名"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                顾客联系电话（选填）
              </label>
              <input
                type="tel"
                className="w-full border rounded-lg px-3 py-2"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="请输入联系电话"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                销售日期（必填）<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleSaveSale}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              保存销售信息
            </button>
            
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              打印凭证
            </button>
          </div>
        </section>
      )}

      {/* 配置弹窗 */}
      {showConfigDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* 标题 */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">产品查询配置</h2>
                <button
                  onClick={() => setShowConfigDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm text-gray-600">
                配置产品查询系统的基本信息，包括CSV数据源和店铺信息。
              </div>

              {/* CSV文件配置 */}
              <section className="border rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  数据源配置
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CSV文件路径
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        value={configForm.csvFilePath}
                        onChange={(e) => setConfigForm(prev => ({ ...prev, csvFilePath: e.target.value }))}
                        placeholder="请输入或选择CSV文件路径"
                      />
                      <button
                        onClick={handleSelectCsvFile}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        浏览
                      </button>
                      {configForm.csvFilePath.trim() && (
                        <button
                          onClick={handleReselectCsvFile}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                        >
                          重新选择
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      指向包含产品数据的CSV文件，格式应与CSV扫描器导出的文件一致
                      {configForm.csvFilePath.trim() && (
                        <><br/>💡 如果遇到权限错误，请点击"重新选择"来重新授权访问文件</>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleTestCsvConnection}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={!configForm.csvFilePath.trim()}
                  >
                    测试连接
                  </button>
                </div>
              </section>

              {/* 店铺信息配置 */}
              <section className="border rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold">店铺信息配置</h3>
                <div className="text-sm text-gray-600">
                  此信息将显示在打印的销售凭证上
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      零售单位名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2"
                      value={configForm.retailUnitName}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, retailUnitName: e.target.value }))}
                      placeholder="请输入店铺名称"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系电话 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full border rounded-lg px-3 py-2"
                      value={configForm.phoneNumber}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="请输入联系电话"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    经营地址 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 h-20 resize-none"
                    value={configForm.businessAddress}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, businessAddress: e.target.value }))}
                    placeholder="请输入完整的经营地址"
                  />
                </div>
              </section>

              {/* 配置预览 */}
              {(configForm.retailUnitName || configForm.businessAddress || configForm.phoneNumber) && (
                <section className="border rounded-lg p-4 space-y-4 bg-gray-50">
                  <h3 className="text-lg font-semibold">打印预览</h3>
                  <div className="text-sm text-gray-600">
                    以下是销售凭证上显示的信息预览：
                  </div>
                  
                  <div className="bg-white p-4 border rounded font-mono text-sm space-y-1">
                    <div className="text-center font-bold text-lg">
                      {configForm.retailUnitName || "[店铺名称]"}
                    </div>
                    <div className="text-center border-b border-dashed pb-2 mb-2">
                      销售凭证
                    </div>
                    <div>经营地址：{configForm.businessAddress || "[经营地址]"}</div>
                    <div>电话：{configForm.phoneNumber || "[联系电话]"}</div>
                  </div>
                </section>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={() => {
                    setConfigForm({
                      csvFilePath: "",
                      retailUnitName: "",
                      businessAddress: "",
                      phoneNumber: ""
                    });
                  }}
                  className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  重置配置
                </button>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfigDialog(false)}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  
                  <button
                    onClick={handleSaveConfig}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    保存配置
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
