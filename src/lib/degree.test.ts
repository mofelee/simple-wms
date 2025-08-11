import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseDegreeFromApi } from './degree';

describe('degree.ts', () => {
  // Mock window.prompt
  const mockPrompt = vi.fn();
  const originalPrompt = window.prompt;

  beforeEach(() => {
    window.prompt = mockPrompt;
    mockPrompt.mockClear();
  });

  afterEach(() => {
    window.prompt = originalPrompt;
  });

  describe('parseDegreeFromApi - 自动解析功能', () => {
    it('应该从产品其他描述信息中解析度数', async () => {
      const deviceInfo = {
        '产品其他描述信息': '月抛型软性亲水接触镜6片装-7.00',
        '规格型号': '月抛型'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-700');
    });

    it('应该从产品其他描述信息中解析复杂格式的度数', async () => {
      const deviceInfo = {
        '产品其他描述信息': '软性亲水接触镜（轻澈日抛） 30片装 830 142 -02.75',
        '规格型号': '日抛型'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-275');
    });

    it('应该从规格型号中解析度数（当产品其他描述信息无度数时）', async () => {
      const deviceInfo = {
        '产品其他描述信息': '软性亲水接触镜30片装',
        '规格型号': '经典系列_夜翎灰_05_-2.25D'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-225');
    });

    it('应该解析正度数', async () => {
      const deviceInfo = {
        '产品其他描述信息': '远视隐形眼镜+3.50D',
        '规格型号': '远视型'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('+350');
    });

    it('应该解析带"度"后缀的度数', async () => {
      const deviceInfo = {
        '产品其他描述信息': '近视隐形眼镜-4.75度',
        '规格型号': '近视型'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-475');
    });

    it('应该取最后一次出现的度数', async () => {
      const deviceInfo = {
        '产品其他描述信息': '测试-1.00，实际度数-7.50',
        '规格型号': '测试型'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-750');
    });

    it('应该处理全角字符', async () => {
      const deviceInfo = {
        '产品其他描述信息': '月抛型软性亲水接触镜６片装－７．００',
        '规格型号': '月抛型'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-700');
    });

    it('应该处理空格', async () => {
      const deviceInfo = {
        '产品其他描述信息': '月抛型软性亲水接触镜6片装 - 7.00 D',
        '规格型号': '月抛型'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-700');
    });
  });

  describe('parseDegreeFromApi - 手动输入功能', () => {
    it('当无法自动解析时应该调用手动输入', async () => {
      const deviceInfo = {
        '产品其他描述信息': '无度数信息',
        '规格型号': '普通型'
      };

      mockPrompt.mockReturnValue('-5.25');

      const result = await parseDegreeFromApi(deviceInfo);
      
      expect(mockPrompt).toHaveBeenCalledWith(
        expect.stringContaining('未能从接口数据中解析到度数'),
        ''
      );
      expect(result).toBe('-525');
    });

    it('应该处理手动输入的小数格式', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue('-7.00');

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-700');
    });

    it('应该处理手动输入的去点格式', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue('-275');

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-275');
    });

    it('应该处理手动输入的正度数', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue('+3.50');

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('+350');
    });

    it('应该处理手动输入的无符号度数并自动添加负号', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue('2.75');

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-275');
    });

    it('应该处理手动输入带D后缀', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue('-4.25D');

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-425');
    });

    it('应该处理手动输入带度后缀', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue('-3.75度');

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-375');
    });

    it('当用户取消输入时应该返回空字符串', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue(null);

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('');
    });

    it('当用户输入无效格式时应该返回空字符串', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue('invalid');

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('');
    });

    it('当用户输入空字符串时应该返回空字符串', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue('');

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('');
    });
  });

  describe('parseDegreeFromApi - 度数格式转换', () => {
    it('应该将整数小数转换为百分位格式', async () => {
      const deviceInfo = {
        '产品其他描述信息': '度数-5.00D'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-500');
    });

    it('应该将一位小数转换为百分位格式', async () => {
      const deviceInfo = {
        '产品其他描述信息': '度数-7.5D'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-750');
    });

    it('应该将两位小数转换为百分位格式', async () => {
      const deviceInfo = {
        '产品其他描述信息': '度数-2.75D'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-275');
    });

    it('应该处理前导零', async () => {
      const deviceInfo = {
        '产品其他描述信息': '度数-0.25D'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-25');
    });

    it('应该处理零度数', async () => {
      const deviceInfo = {
        '产品其他描述信息': '度数0.00D'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('0');
    });

    it('应该保留符号', async () => {
      const tests = [
        { input: '+1.25D', expected: '+125' },
        { input: '-1.25D', expected: '-125' },
        { input: '1.25D', expected: '125' }
      ];

      for (const { input, expected } of tests) {
        const deviceInfo = {
          '产品其他描述信息': `度数${input}`
        };
        const result = await parseDegreeFromApi(deviceInfo);
        expect(result).toBe(expected);
      }
    });

    it('应该处理已经是百分位格式的输入', async () => {
      const deviceInfo = {};
      mockPrompt.mockReturnValue('-275');

      const result = await parseDegreeFromApi(deviceInfo);
      expect(result).toBe('-275');
    });
  });

  describe('parseDegreeFromApi - 边界情况', () => {
    it('应该处理null输入', async () => {
      const result = await parseDegreeFromApi(null);
      expect(mockPrompt).toHaveBeenCalled();
    });

    it('应该处理undefined输入', async () => {
      const result = await parseDegreeFromApi(undefined);
      expect(mockPrompt).toHaveBeenCalled();
    });

    it('应该处理空对象输入', async () => {
      const result = await parseDegreeFromApi({});
      expect(mockPrompt).toHaveBeenCalled();
    });

    it('应该处理字段为null的对象', async () => {
      const deviceInfo = {
        '产品其他描述信息': null,
        '规格型号': null
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(mockPrompt).toHaveBeenCalled();
    });

    it('应该处理字段为undefined的对象', async () => {
      const deviceInfo = {
        '产品其他描述信息': undefined,
        '规格型号': undefined
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(mockPrompt).toHaveBeenCalled();
    });

    it('应该处理空字符串字段', async () => {
      const deviceInfo = {
        '产品其他描述信息': '',
        '规格型号': ''
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(mockPrompt).toHaveBeenCalled();
    });

    it('应该处理不包含度数的文本', async () => {
      const deviceInfo = {
        '产品其他描述信息': '这是一个没有度数的描述',
        '规格型号': '普通规格'
      };

      const result = await parseDegreeFromApi(deviceInfo);
      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  describe('parseDegreeFromApi - 自动补全负号功能', () => {
    it('应该为无符号数字自动添加负号', async () => {
      const tests = [
        { input: '700', expected: '-700' },
        { input: '2.75', expected: '-275' },
        { input: '1.25', expected: '-125' },
        { input: '525', expected: '-525' }
      ];

      for (const { input, expected } of tests) {
        const deviceInfo = {};
        mockPrompt.mockReturnValue(input);
        
        const result = await parseDegreeFromApi(deviceInfo);
        expect(result).toBe(expected);
      }
    });

    it('应该保持已有正号不变', async () => {
      const tests = [
        { input: '+700', expected: '+700' },
        { input: '+2.75', expected: '+275' },
        { input: '+1.25', expected: '+125' }
      ];

      for (const { input, expected } of tests) {
        const deviceInfo = {};
        mockPrompt.mockReturnValue(input);
        
        const result = await parseDegreeFromApi(deviceInfo);
        expect(result).toBe(expected);
      }
    });

    it('应该保持已有负号不变', async () => {
      const tests = [
        { input: '-700', expected: '-700' },
        { input: '-2.75', expected: '-275' },
        { input: '-1.25', expected: '-125' }
      ];

      for (const { input, expected } of tests) {
        const deviceInfo = {};
        mockPrompt.mockReturnValue(input);
        
        const result = await parseDegreeFromApi(deviceInfo);
        expect(result).toBe(expected);
      }
    });

    it('应该处理带度数单位的输入', async () => {
      const tests = [
        { input: '700度', expected: '-700' },
        { input: '+700D', expected: '+700' },
        { input: '-700度', expected: '-700' }
      ];

      for (const { input, expected } of tests) {
        const deviceInfo = {};
        mockPrompt.mockReturnValue(input);
        
        const result = await parseDegreeFromApi(deviceInfo);
        expect(result).toBe(expected);
      }
    });

    it('应该处理带空格的输入', async () => {
      const tests = [
        { input: ' 700 ', expected: '-700' },
        { input: ' + 700 ', expected: '+700' },
        { input: ' - 700 ', expected: '-700' }
      ];

      for (const { input, expected } of tests) {
        const deviceInfo = {};
        mockPrompt.mockReturnValue(input);
        
        const result = await parseDegreeFromApi(deviceInfo);
        expect(result).toBe(expected);
      }
    });
  });
});
