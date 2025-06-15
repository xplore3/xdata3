export function extractJson(input: string): any {
  // 尝试1：直接解析整个输入（如果是纯JSON）
  try {
    return JSON.parse(input);
  } catch (e) {
    // 尝试2：提取代码块中的JSON内容
    const codeBlockMatch = input.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (e) {
        // 代码块内容不是有效JSON
        console.log(e);
      }
    }
    
    // 尝试3：提取可能被包裹的JSON（没有代码块标记但有缩进等）
    const jsonCandidate = input.trim()
      .replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1');
    try {
      return JSON.parse(jsonCandidate);
    } catch (e) {
      //throw new Error("无法从输入中提取有效的JSON");
      console.log(e);
    }
  }
  return input;
}
