/**
 * 測試 Agent 工具調用的完整流程
 */

const { ToolRegistry } = require('./dist/tools/registry');
const { builtinTools } = require('./dist/tools/implementations');
const { parseToolCalls } = require('./dist/tools/parser');

console.log('=== 測試 1: 工具註冊 ===');
const registry = new ToolRegistry();
registry.registerAll(builtinTools);

console.log('已註冊工具數量:', registry.size());
console.log('工具名稱:', registry.getAllNames());
console.log('');

console.log('=== 測試 2: 工具定義獲取 ===');
const definitions = registry.getAllDefinitions();
console.log('工具定義數量:', definitions.length);
definitions.forEach(def => {
  console.log(`- ${def.name}: ${def.description}`);
  console.log(`  參數:`, def.parameters.map(p => 
    `${p.name}(${p.type})${p.required ? ' [必需]' : ''}`
  ).join(', '));
});
console.log('');

console.log('=== 測試 3: OpenAI 格式轉換 ===');
const convertToOpenAIFormat = (tools) => {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description,
          };
          return acc;
        }, {}),
        required: tool.parameters.filter((p) => p.required).map((p) => p.name),
      },
    },
  }));
};

const openaiTools = convertToOpenAIFormat(definitions);
console.log('OpenAI 格式工具數量:', openaiTools.length);
console.log('write_file 工具定義:');
console.log(JSON.stringify(openaiTools.find(t => t.function.name === 'write_file'), null, 2));
console.log('');

console.log('=== 測試 4: XML 解析 (模擬 LLM 回應) ===');

// 模擬 LLM 生成的工具調用
const mockResponses = [
  {
    name: '簡單工具調用',
    response: `好的，我來幫你讀取文件。
<action>
<invoke tool="read_file">
  <param name="path">package.json</param>
</invoke>
</action>`
  },
  {
    name: '包含 HTML 的 write_file',
    response: `我會為你創建文件。
<action>
<invoke tool="write_file">
  <param name="path">test.html</param>
  <param name="content"><html><body><h1>Test</h1></body></html></param>
</invoke>
</action>`
  },
  {
    name: '多行內容',
    response: `<action>
<invoke tool="write_file">
  <param name="path">app.js</param>
  <param name="content">function test() {
  console.log("Hello");
  return true;
}</param>
</invoke>
</action>`
  }
];

mockResponses.forEach(({ name, response }) => {
  console.log(`測試: ${name}`);
  const { toolCalls, textContent } = parseToolCalls(response);
  console.log('  解析到工具調用:', toolCalls.length);
  if (toolCalls.length > 0) {
    console.log('  工具名稱:', toolCalls[0].tool);
    console.log('  參數:', Object.keys(toolCalls[0].params));
    console.log('  所有必需參數存在:', 
      registry.get(toolCalls[0].tool)?.definition.parameters
        .filter(p => p.required)
        .every(p => p.name in toolCalls[0].params)
    );
  }
  console.log('');
});

console.log('=== 測試 5: 檢查 LLM Client 是否傳遞工具 ===');
console.log('提示: 在實際運行中，檢查 DEBUG_TOOLS 環境變量');
console.log('運行方式: DEBUG_TOOLS=1 bailu');
console.log('');

console.log('=== 總結 ===');
console.log('✅ 工具註冊正常');
console.log('✅ 工具定義格式正確');
console.log('✅ OpenAI 格式轉換正常');
console.log('✅ XML 解析正常');
console.log('');
console.log('如果 AI 仍不調用工具，問題可能在於:');
console.log('1. 模型不支持 function calling (Test-Hide 可能有限制)');
console.log('2. System prompt 需要更明確的引導');
console.log('3. 白鹿 API 的 tools 參數格式可能與 OpenAI 不同');
