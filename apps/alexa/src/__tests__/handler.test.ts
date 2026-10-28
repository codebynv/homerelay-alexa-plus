import { HandlerInput } from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import { jest } from '@jest/globals';

// Mock the module before importing the handler
const mockCallTool = jest.fn<() => Promise<{ result: { available: string[]; missing: string[] } }>>().mockResolvedValue({
  result: { available: ['milk'], missing: ['eggs'] }
});

jest.unstable_mockModule('@modelcontextprotocol/sdk/client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    callTool: mockCallTool,
  })),
}));

// Now import the handler after mocking
const { CheckPantryIntentHandler, LaunchRequestHandler, HelpIntentHandler } = await import('../index.js');

// Mock request envelope for CheckPantryIntent with ingredients slot
const mockRequestEnvelope = {
  version: '1.0',
  session: { new: true, sessionId: 'test', application: { applicationId: 'app' }, user: { userId: 'user' }, attributes: {} },
  context: { System: { device: { supportedInterfaces: {} }, application: { applicationId: 'app' }, user: { userId: 'user' } } },
  request: {
    type: 'IntentRequest',
    requestId: 'req',
    timestamp: new Date().toISOString(),
    locale: 'en-US',
    intent: {
      name: 'CheckPantryIntent',
      confirmationStatus: 'NONE',
      slots: {
        ingredients: { name: 'ingredients', value: 'milk, eggs' }
      }
    }
  }
} as unknown as RequestEnvelope;

const mockHandlerInput = {
  requestEnvelope: mockRequestEnvelope,
  responseBuilder: {
    speak: function (output: string) { this.output = output; return this; },
    reprompt: function (_output: string) { return this; },
    getResponse: function () { return { outputSpeech: { ssml: `<speak>${this.output}</speak>` } }; },
    output: ''
  }
} as unknown as HandlerInput;

test('CheckPantryIntentHandler returns spoken response with available and missing items', async () => {
  expect(CheckPantryIntentHandler.canHandle(mockHandlerInput as any)).toBe(true);
  const response = await CheckPantryIntentHandler.handle(mockHandlerInput as any);
  const speech = (response?.outputSpeech as any)?.ssml || '';
  expect(speech).toContain('Available:');
  expect(speech).toContain('Missing:');
});

test('LaunchRequestHandler responds to LaunchRequest', async () => {
  const launchInput = {
    ...mockHandlerInput,
    requestEnvelope: {
      ...mockRequestEnvelope,
      request: { type: 'LaunchRequest', requestId: 'req-launch', timestamp: new Date().toISOString() },
    },
  } as unknown as HandlerInput;

  expect(LaunchRequestHandler.canHandle(launchInput)).toBe(true);
  const response = await LaunchRequestHandler.handle(launchInput);
  const speech = (response?.outputSpeech as any)?.ssml || '';
  expect(speech).toContain('Welcome to HomeRelay');
});

test('HelpIntentHandler responds to HelpIntent', async () => {
  const helpInput = {
    ...mockHandlerInput,
    requestEnvelope: {
      ...mockRequestEnvelope,
      request: {
        type: 'IntentRequest',
        requestId: 'req-help',
        timestamp: new Date().toISOString(),
        intent: { name: 'AMAZON.HelpIntent' },
      },
    },
  } as unknown as HandlerInput;

  expect(HelpIntentHandler.canHandle(helpInput)).toBe(true);
  const response = await HelpIntentHandler.handle(helpInput);
  const speech = (response?.outputSpeech as any)?.ssml || '';
  expect(speech).toContain('pantry');
});
