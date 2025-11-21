/**
 * 测试解析包含 <!DOCTYPE 的 content 参数
 */

const { parseToolCalls } = require('./dist/tools/parser');

console.log('=== 测试解析包含 <!DOCTYPE 的 XML ===\n');

const testXML = `好的！我来为你更新文件。

<action>
<invoke tool="write_file">
  <param name="path">index.html</param>
  <param name="content"><!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>Test Page</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html></param>
</invoke>
</action>

更新完成！`;

const result = parseToolCalls(testXML);

console.log('解析结果:');
console.log('- 工具调用数量:', result.toolCalls.length);

if (result.toolCalls.length > 0) {
  const call = result.toolCalls[0];
  console.log('- 工具名称:', call.tool);
  console.log('- 参数列表:', Object.keys(call.params));
  console.log('- path 参数:', call.params.path);
  console.log('- content 是否存在:', 'content' in call.params);
  
  if (call.params.content) {
    console.log('- content 长度:', call.params.content.length);
    console.log('- content 开头:', call.params.content.substring(0, 50) + '...');
    console.log('- 包含 <!DOCTYPE:', call.params.content.includes('<!DOCTYPE'));
    console.log('- 包含 </html>:', call.params.content.includes('</html>'));
    console.log('\n✅ 成功解析包含 <!DOCTYPE 的 content 参数！');
  } else {
    console.log('\n❌ content 参数缺失！');
  }
} else {
  console.log('\n❌ 没有解析到任何工具调用！');
}
