import { TestSample } from './types';

/**
 * 扫码测试样例数据
 */
export const testSamples: TestSample[] = [
  {
    name: "用户示例 (固定长度AI)",
    data: "0100196527094841112409241729082310UDD242363\x1D2100298",
    description: "GTIN + 生产日期 + 有效期 + 批次 + 序列号",
  },
  {
    name: "UDI示例 (含产品信息)",
    data: "(01)06923604463221(17)251231(10)ABC123",
    description: "海昌隐形眼镜 + 有效期 + 批次 (自动查询UDI)",
  },
  {
    name: "括号格式",
    data: "(01)12345678901234(17)251231(10)ABC123(21)XYZ789",
    description: "产品 + 有效期 + 批次 + 序列号",
  },
  {
    name: "简单GTIN",
    data: "(01)12345678901234",
    description: "基础产品标识",
  },
  {
    name: "带有效期的产品",
    data: "01123456789012341725123110ABC123",
    description: "GTIN + 有效期 + 批次",
  },
  {
    name: "医疗设备UDI",
    data: "(01)00889842002306(17)301231(10)A220B1(21)H12345",
    description: "医疗设备 + 有效期 + 批次 + 序列号",
  },
  {
    name: "药品标识",
    data: "(01)03161234567890(17)250630(10)LOT001",
    description: "药品GTIN + 有效期 + 批次号",
  },
  {
    name: "长序列号示例",
    data: "(01)14567890123456(21)ABCDEFGHIJ1234567890",
    description: "产品 + 长序列号",
  },
  {
    name: "多AI复合格式",
    data: "(01)98765432109876(17)231215(10)B001(21)SN123(240)https://example.com",
    description: "产品 + 有效期 + 批次 + 序列号 + 网址",
  },
  {
    name: "含特殊字符",
    data: "(01)11223344556677(10)ABC-123/XYZ",
    description: "产品 + 含特殊字符的批次",
  },
];
