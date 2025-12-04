// AI SDK mock for testing
// Usage: jest.mock('ai', () => require('@/test/mocks/ai').aiMock);
// Usage: jest.mock('@ai-sdk/openai', () => require('@/test/mocks/ai').openaiMock);

export const mockGenerateObject = jest.fn();
export const mockGenerateText = jest.fn();
export const mockStreamText = jest.fn();

export const aiMock = {
  generateObject: mockGenerateObject,
  generateText: mockGenerateText,
  streamText: mockStreamText,
};

export const mockOpenai = jest.fn((model: string) => ({
  modelId: model,
}));

export const openaiMock = {
  openai: mockOpenai,
};

// Helper to set AI response
export const setAIResponse = (response: unknown) => {
  mockGenerateObject.mockResolvedValue({ object: response });
  mockGenerateText.mockResolvedValue({ text: JSON.stringify(response) });
};

// Helper to make AI throw error
export const setAIError = (error: Error) => {
  mockGenerateObject.mockRejectedValue(error);
  mockGenerateText.mockRejectedValue(error);
};

// Reset all AI mocks
export const resetAIMocks = () => {
  mockGenerateObject.mockReset();
  mockGenerateText.mockReset();
  mockStreamText.mockReset();
  mockOpenai.mockReset();
};
