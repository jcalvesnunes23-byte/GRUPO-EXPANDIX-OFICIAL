
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  async generateTasksFromNaturalLanguage(prompt: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Transforme este pedido em uma lista de tarefas de projeto em formato JSON e em Português: "${prompt}". 
      Inclua título, descrição e prioridade (Baixa, Média, Alta).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING }
            },
            required: ["title", "description", "priority"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  },

  async suggestAutomations(boardContext: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base nesta descrição de quadro: "${boardContext}", sugira 3 automações no-code em Português. 
      Formate como um array JSON de objetos com "name", "trigger" e "action".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              trigger: { type: Type.STRING },
              action: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  },

  async summarizeActivity(activities: string[]) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Resuma estas atividades recentes do projeto em Português e destaque possíveis riscos ou atrasos: ${activities.join('. ')}`,
    });
    return response.text;
  }
};
