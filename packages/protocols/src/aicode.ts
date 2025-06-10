import { VM } from "vm2";

import {
    ModelClass,
    Memory,
    UUID,
    generateText,
    type IAgentRuntime,
} from "@data3os/agentcontext";

const externalJson = { key: "value" };
const aiCodeCache = new Map<string, string>();

/**
 * 生成AI代码的建议实现
 * @param prompt 用户输入的代码生成提示
 * @returns 生成的代码字符串
 */
export async function executeAICode(
    items: any[],
    originquestion: string,
    runtime: IAgentRuntime
): Promise<any> {
    const timestamp = Math.floor(Date.now() / (60 * 1000)); 
    const cacheKey = `${originquestion}|${timestamp}`;
    let aicode = aiCodeCache.get(cacheKey);
    const prompt = `
      下面是一个 json 结构，输入为这个对象的数组，请你按照用户的问题写一个过滤，筛选出用户需要的列表。
      缺少的数据不需要补充，只做出筛选即可。
      只筛选点赞数liked_count、收藏数collected_count、分享shared_count、时间timestamp这四个字段。除非用户问题中明确要求标题title、描述desc包含某个关键词，否则不筛选标题、描述。
      因为这是根据 API 返回的结果，帖子已经和关键字相关联了。
      请你使用 node js 代码实现。
[用户问题： ${originquestion}]
[数据结构：{
    "author": "小明来说酒",
    "collected_count": 97,
    "shared_count": 109,
    "liked_count": 360,
    "comments_count": 41,
    "id": "653e0cc2000000001f03556d",
    "title": "徒手开红酒，100%可复现，0难度！",
    "desc": "事件还原：外出购得一瓶红酒，手里没有任何工具。",
    "timestamp": 1698565315
}]

[代码要求： 为了和外面衔接函数固定为calculate。输入参数为一个对象的数组： arr。返回过滤后的数组。]
[代码示例：
function calculate(arr) {
  // 过滤出点赞数超过 100 的红酒笔记（这里是举例，不是所有数据都需要筛选点赞数，只根据用户的问题进行筛选）
  const filteredData = arr.filter(item => item.liked_count > 100);
  // 返回筛选后的结果
  return filteredData;
}
]
你只要返回这个函数的代码，不要包含其他内容。
`;

    if (!aicode) {
        try {
            aicode = await generateText({
                runtime,
                context: prompt,
                modelClass: ModelClass.MEDIUM,
            });
            aicode = aicode
                .replace(/```javascript/g, "")
                .replace(/```js/g, "")
                .replace(/```/g, "");
            aiCodeCache.set(cacheKey, aicode);
            console.log(
                `====================aicode begin====================\n${aicode}\n====================aicode end====================`
            );
        } catch (e) {
            console.error("Failed to generate ai code:", e);
        }
    }

    const vm = new VM({
        timeout: 1000,
        memoryLimit: 10,
        sandbox: {
            safeApi: {
                log: console.log,
            },
            externalData: externalJson,
            resultExports: {},
        },
    });
    const aiGeneratedCode = `${aicode}
    resultExports.calculate = calculate;
    `;
    vm.run(aiGeneratedCode);
    const exportedFunction = vm.sandbox.resultExports.calculate;
    const results = exportedFunction(items);
    return results;
}
