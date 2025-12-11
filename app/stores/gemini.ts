import {
  GoogleGenerativeAI,
  SchemaType,
  type ChatSession,
  type GenerativeModel,
} from "@google/generative-ai";
import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref } from "vue";
import { useGitHubStore } from "./github";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export const useGeminiStore = defineStore("gemini", () => {
  const apiKey = useStorage("gemini_api_key", "");
  const history = ref<ChatMessage[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const pendingChange = ref<{ content: string; original: string } | null>(null);

  let model: GenerativeModel | null = null;
  let chat: ChatSession | null = null;

  const gitStore = useGitHubStore();

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
    if (apiKey.value) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey.value);
        model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          tools: tools,
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

  const setApiKey = (key: string) => {
    apiKey.value = key;
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
      // Add user message to history immediatley for UI
      history.value.push({ role: "user", text: message });

      const prompt = context
        ? `Context: The user is writing a markdown file. Current content snippet:\n${context}\n\nUser Request: ${message}\n\nIMPORTANT: If you want to make changes to the file (edit, add, delete), you MUST use the 'edit_current_note' tool. Do not just output the file content in the chat.`
        : message;

      // Re-init chat to be safe or if history changed externally
      if (!chat) {
        const genAI = new GoogleGenerativeAI(apiKey.value);
        model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          tools: tools,
        });
        chat = model.startChat({});
      }

      // Add placeholder for model response
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

      // Handle function calls
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
                // Instead of updating immediately, set pending change
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

        // Send function response back to model
        // Note: We need to stream this too if we want the follow-up explanation to stream
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
      // Remove failed user message? Or keep it?
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
  };
});
