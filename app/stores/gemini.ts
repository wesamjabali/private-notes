import {
    GoogleGenerativeAI,
    SchemaType,
    type ChatSession,
    type GenerativeModel,
} from "@google/generative-ai";
import { defineStore } from "pinia";
import { ref } from "vue";
import { useGitStore } from "./git";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export const useGeminiStore = defineStore("gemini", () => {
  const settings = useSettingsStore();
  const apiKey = computed(() => settings.geminiApiKey);
  const history = ref<ChatMessage[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const pendingChange = ref<{ content: string; original: string } | null>(null);

  let model: GenerativeModel | null = null;
  let inlineModel: GenerativeModel | null = null;
  let chat: ChatSession | null = null;

  const gitStore = useGitStore();

  const tools: any = [
    {
      functionDeclarations: [
        {
          name: "edit_current_note",
          description:
            "Replaces the content of the currently open note with new content. YOU MUST USE THIS TOOL if the user asks to edit, update, modify, or add content to the note. Do not just print the content.",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              content: {
                type: SchemaType.STRING,
                description: "The new full content of the note.",
              },
            },
            required: ["content"],
          },
        },
        {
          name: "create_new_note",
          description:
            "Creates a new markdown note with the specified filename and content. Use this when the user asks to create a new note or file.",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              filename: {
                type: SchemaType.STRING,
                description: "The name of the file (e.g., 'my-note.md').",
              },
              content: {
                type: SchemaType.STRING,
                description: "The content of the new note.",
              },
            },
            required: ["filename", "content"],
          },
        },
      ],
    },
  ];

  const init = () => {
    const config = useRuntimeConfig();
    const effectiveKey = apiKey.value || config.public.geminiApiKey;

    if (effectiveKey) {
      try {
        const genAI = new GoogleGenerativeAI(effectiveKey);
        model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          tools: tools,
        });
        inlineModel = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
        });
        chat = model.startChat({
          history: history.value.map((h) => ({
            role: h.role,
            parts: [{ text: h.text }],
          })),
        });
      } catch (e: any) {
        error.value = "Failed to init Gemini: " + e.message;
      }
    }
  };

  const setApiKey = async (key: string) => {
    settings.geminiApiKey = key;
    await settings.saveSettings();
    init();
  };

  const acceptChange = () => {
    if (pendingChange.value) {
      gitStore.updateContent(pendingChange.value.content);
      pendingChange.value = null;
    }
  };

  const rejectChange = () => {
    pendingChange.value = null;
  };

  const sendMessage = async (message: string, context: string = "") => {
    if (!model) init();
    if (!model) {
      error.value = "Gemini API Key missing";
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      
      history.value.push({ role: "user", text: message });

      const prompt = context
        ? `Context: The user is writing a markdown file. Current content snippet:\n${context}\n\nUser Request: ${message}\n\nIMPORTANT: If you want to make changes to the file (edit, add, delete), you MUST use the 'edit_current_note' tool. Do not just output the file content in the chat.`
        : message;

      
      if (!chat) {
        const config = useRuntimeConfig();
        const effectiveKey = apiKey.value || config.public.geminiApiKey;

        if (effectiveKey) {
          const genAI = new GoogleGenerativeAI(effectiveKey);
          model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            tools: tools,
          });
          chat = model.startChat({});
        } else {
          error.value = "Gemini API Key missing";
          return;
        }
      }

      
      const modelMsgIndex = history.value.push({ role: "model", text: "" }) - 1;

      let result = await chat.sendMessageStream(prompt);

      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        if (history.value[modelMsgIndex]) {
          history.value[modelMsgIndex].text = fullText;
        }
      }

      let response = await result.response;

      
      const calls = response.functionCalls();
      if (calls) {
        const functionResponses = [];

        for (const call of calls) {
          const name = call.name;
          const args = call.args as any;

          let functionResponse = {};

          if (name === "edit_current_note") {
            try {
              const content = args.content;
              if (gitStore.currentFilePath) {
                
                pendingChange.value = {
                  content: content,
                  original: gitStore.currentFileContent || "",
                };

                functionResponse = {
                  status: "success",
                  message: "Change proposed to user. Waiting for confirmation.",
                };
              } else {
                functionResponse = {
                  status: "error",
                  message: "No note is currently open.",
                };
              }
            } catch (e: any) {
              functionResponse = { status: "error", message: e.message };
            }
          } else if (name === "create_new_note") {
            try {
              const filename = args.filename;
              const content = args.content;

              let parentPath = "";
              if (gitStore.currentFilePath) {
                const parts = gitStore.currentFilePath.split("/");
                parts.pop();
                parentPath = parts.join("/");
              }

              const path = parentPath ? `${parentPath}/${filename}` : filename;
              await gitStore.createFile(path, content, "Created by AI");
              await gitStore.openFile(path);
              functionResponse = {
                status: "success",
                message: `Note created at ${path} and opened.`,
              };
            } catch (e: any) {
              functionResponse = { status: "error", message: e.message };
            }
          }

          functionResponses.push({
            functionResponse: {
              name: name,
              response: functionResponse,
            },
          });
        }

        
        
        const result2 = await chat.sendMessageStream(functionResponses);

        for await (const chunk of result2.stream) {
          const chunkText = chunk.text();
          if (history.value[modelMsgIndex]) {
            history.value[modelMsgIndex].text += chunkText;
          }
        }
      }
    } catch (e: any) {
      error.value = e.message;
      
    } finally {
      isLoading.value = false;
    }
  };

  const clearHistory = () => {
    history.value = [];
    pendingChange.value = null;
    chat = null;
    init();
  };

  const getInlineCompletion = async (
    prefix: string,
    suffix: string
  ): Promise<string | null> => {
    if (!apiKey.value) return null;
    if (!inlineModel) init();
    if (!inlineModel) return null;

    try {
      
      const contextSize = settings.inlineSuggestionContextSize;
      const limitedPrefix = prefix.slice(-contextSize);
      const limitedSuffix = suffix.slice(0, contextSize);

      const prompt = `You are a helpful AI assistant that provides inline completions for markdown notes.
You will be given a prefix (text before the cursor) and a suffix (text after the cursor).
Your task is to generate the text that should fill the gap between the prefix and the suffix.
Return ONLY the completion text. Do not repeat the prefix or suffix.
If there is no logical completion, return an empty string.
Keep the completion concise and relevant to the context.

Prefix:
${limitedPrefix}

Suffix:
${limitedSuffix}`;

      const result = await inlineModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: settings.inlineSuggestionMaxTokens,
        },
      });
      const response = await result.response;
      return response.text();
    } catch (e) {
      console.error("Inline completion failed", e);
      return null;
    }
  };

  return {
    apiKey,
    history,
    isLoading,
    error,
    pendingChange,
    setApiKey,
    sendMessage,
    acceptChange,
    rejectChange,
    clearHistory,
    getInlineCompletion,
  };
});
