import type { AgentRuntime } from "./runtime.ts";
import { embed, getEmbeddingZeroVector } from "./embedding.ts";
import type { KnowledgeItem, UUID, Memory } from "./types.ts";
import { stringToUuid } from "./uuid.ts";
import { splitChunks } from "./generation.ts";
import data3Logger from "./logger.ts";

async function get(
    runtime: AgentRuntime,
    message: Memory
): Promise<KnowledgeItem[]> {
    // Add validation for message
    if (!message?.content?.text) {
        data3Logger.warn("Invalid message for knowledge query:", {
            message,
            content: message?.content,
            text: message?.content?.text,
        });
        return [];
    }

    const processed = preprocess(message.content.text);
    data3Logger.debug("Knowledge query:", {
        original: message.content.text,
        processed,
        length: processed?.length,
    });

    // Validate processed text
    if (!processed || processed.trim().length === 0) {
        data3Logger.warn("Empty processed text for knowledge query");
        return [];
    }

    const embedding = await embed(runtime, processed);
    const fragments = await runtime.knowledgeManager.searchMemoriesByEmbedding(
        embedding,
        {
            roomId: message.agentId,
            count: 5,
            match_threshold: 0.1,
        }
    );

    const uniqueSources = [
        ...new Set(
            fragments.map((memory) => {
                data3Logger.log(
                    `Matched fragment: ${memory.content.text} with similarity: ${memory.similarity}`
                );
                return memory.content.source;
            })
        ),
    ];

    const knowledgeDocuments = await Promise.all(
        uniqueSources.map((source) =>
            runtime.documentsManager.getMemoryById(source as UUID)
        )
    );

    return knowledgeDocuments
        .filter((memory) => memory !== null)
        .map((memory) => ({ id: memory.id, content: memory.content }));
}

async function set(
    runtime: AgentRuntime,
    item: KnowledgeItem,
    chunkSize = 512,
    bleed = 20
) {
    await runtime.documentsManager.createMemory({
        id: item.id,
        agentId: runtime.agentId,
        roomId: runtime.agentId,
        userId: runtime.agentId,
        createdAt: Date.now(),
        content: item.content,
        embedding: getEmbeddingZeroVector(),
    });

    const preprocessed = preprocess(item.content.text);
    
    // If text is shorter than chunk size, don't split it
    if (preprocessed.length <= chunkSize) {
        const embedding = await embed(runtime, preprocessed);
        await runtime.knowledgeManager.createMemory({
            id: stringToUuid(item.id + preprocessed),
            roomId: runtime.agentId,
            agentId: runtime.agentId,
            userId: runtime.agentId,
            createdAt: Date.now(),
            content: {
                source: item.id,
                text: preprocessed,
            },
            embedding,
        });
        return;
    }

    const fragments = await splitChunks(preprocessed, chunkSize, bleed);

    for (const fragment of fragments) {
        const embedding = await embed(runtime, fragment);
        await runtime.knowledgeManager.createMemory({
            // We namespace the knowledge base uuid to avoid id
            // collision with the document above.
            id: stringToUuid(item.id + fragment),
            roomId: runtime.agentId,
            agentId: runtime.agentId,
            userId: runtime.agentId,
            createdAt: Date.now(),
            content: {
                source: item.id,
                text: fragment,
            },
            embedding,
        });
    }
}

export function preprocess(content: string): string {
    data3Logger.debug("Preprocessing text:", {
        input: content,
        length: content?.length,
    });

    if (!content || typeof content !== "string") {
        data3Logger.warn("Invalid input for preprocessing");
        return "";
    }

    return (
        content
            // Remove code blocks and their content
            .replace(/```[\s\S]*?```/g, "")
            // Remove inline code
            .replace(/`.*?`/g, "")
            // Convert headers to plain text with emphasis
            .replace(/#{1,6}\s*(.*)/g, "$1")
            // Remove image links but keep alt text
            .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
            // Remove links but keep text
            .replace(/\[(.*?)\]\(.*?\)/g, "$1")
            // Simplify URLs: remove protocol and simplify to domain+path
            .replace(/(https?:\/\/)?(www\.)?([^\s]+\.[^\s]+)/g, "$3")
            // Remove Discord mentions specifically
            .replace(/<@[!&]?\d+>/g, "")
            // Remove HTML tags
            .replace(/<[^>]*>/g, "")
            // Remove horizontal rules
            .replace(/^\s*[-*_]{3,}\s*$/gm, "")
            // Remove comments
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/.*/g, "")
            // Normalize whitespace
            .replace(/\s+/g, " ")
            // Remove multiple newlines
            .replace(/\n{3,}/g, "\n\n")
            // Remove special characters except those common in URLs
            .replace(/[^a-zA-Z0-9\s\-_./:?=&]/g, "")
            .trim()
            .toLowerCase()
    );
}

export default {
    get,
    set,
    preprocess,
};
