import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface ConversationContext {
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
  }>;
  userProfile?: {
    name?: string;
    preferences?: any;
    recentActivities?: any;
  };
}

export class AIService {
  private systemPrompt = `You are MindSphere, an AI-powered personal assistant created to help users manage their life, work, and personal growth. You are knowledgeable, empathetic, and proactive.

Your capabilities include:
- Managing schedules, tasks, and priorities
- Tracking health, mood, and wellness
- Providing insights and recommendations
- Helping with decision-making
- Offering emotional support and motivation
- Analyzing patterns in user behavior
- Suggesting improvements and optimizations

Your personality is:
- Helpful and supportive
- Intelligent but not overwhelming
- Personalized and remembers user preferences
- Proactive in offering suggestions
- Encouraging and motivational
- Professional yet warm

Always provide actionable insights and specific recommendations. When possible, reference user data and patterns to make personalized suggestions.`;

  async generateResponse(context: ConversationContext): Promise<string> {
    try {
      const messages = [
        { role: 'system' as const, content: this.systemPrompt },
        ...context.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error("Failed to generate AI response");
    }
  }

  async generateTaskPrioritization(tasks: any[]): Promise<{
    prioritizedTasks: any[];
    insights: string;
  }> {
    try {
      const taskList = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        status: task.status
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specializing in task prioritization and productivity. Analyze the given tasks and provide prioritization recommendations with insights."
          },
          {
            role: "user",
            content: `Please analyze these tasks and provide prioritization recommendations: ${JSON.stringify(taskList)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      return {
        prioritizedTasks: result.prioritizedTasks || tasks,
        insights: result.insights || "I've analyzed your tasks and organized them by priority and due dates."
      };
    } catch (error) {
      console.error("Task prioritization error:", error);
      return {
        prioritizedTasks: tasks,
        insights: "Unable to analyze tasks at the moment. Please try again later."
      };
    }
  }

  async generateHealthInsights(healthData: any[]): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a health and wellness AI assistant. Analyze health data and provide personalized insights and recommendations."
          },
          {
            role: "user",
            content: `Analyze this health data and provide insights: ${JSON.stringify(healthData)}`
          }
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || "I couldn't analyze your health data at the moment. Please try again.";
    } catch (error) {
      console.error("Health insights error:", error);
      throw new Error("Failed to generate health insights");
    }
  }

  async generateMoodInsights(moodData: any[]): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an emotional wellness AI assistant. Analyze mood patterns and provide supportive insights and recommendations."
          },
          {
            role: "user",
            content: `Analyze this mood data and provide insights: ${JSON.stringify(moodData)}`
          }
        ],
        temperature: 0.6,
        max_tokens: 400,
      });

      return response.choices[0]?.message?.content || "I couldn't analyze your mood patterns at the moment. Please try again.";
    } catch (error) {
      console.error("Mood insights error:", error);
      throw new Error("Failed to generate mood insights");
    }
  }

  async generateJournalInsights(journalContent: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a reflective AI assistant that helps users gain insights from their journal entries. Provide thoughtful analysis and gentle guidance."
          },
          {
            role: "user",
            content: `Please analyze this journal entry and provide insights: ${journalContent}`
          }
        ],
        temperature: 0.6,
        max_tokens: 300,
      });

      return response.choices[0]?.message?.content || "I couldn't analyze your journal entry at the moment. Please try again.";
    } catch (error) {
      console.error("Journal insights error:", error);
      throw new Error("Failed to generate journal insights");
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const response = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
        model: "whisper-1",
      });

      return response.text;
    } catch (error) {
      console.error("Audio transcription error:", error);
      throw new Error("Failed to transcribe audio");
    }
  }

  async generateSpeech(text: string): Promise<Buffer> {
    try {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error("Speech generation error:", error);
      throw new Error("Failed to generate speech");
    }
  }
}

export const aiService = new AIService();
