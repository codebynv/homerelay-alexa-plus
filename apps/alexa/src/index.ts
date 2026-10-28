import { SkillBuilders, HandlerInput } from 'ask-sdk-core';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { Client } from '@modelcontextprotocol/sdk/client';
import { z } from 'zod';

const mcpUrl = process.env.MCP_URL || 'http://localhost:4001/mcp';

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
const client = new Client({ name: 'alexa-skill', version: '0.1.0' });
let clientConnected = false;

export const CheckPantryIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'CheckPantryIntent';
  },
  async handle(handlerInput: HandlerInput) {
    const reqAny = handlerInput.requestEnvelope as any;
    const ingredientsSlot = reqAny.request?.intent?.slots?.ingredients?.value || '';
    const ingredients = ingredientsSlot.split(/,|and/).map((s: string) => s.trim()).filter(Boolean);
    try {
      if (!clientConnected) {
        await client.connect(transport);
        clientConnected = true;
      }
      const response: any = await client.callTool({ name: 'check_pantry', arguments: { ingredients } });
      const data = response.structuredContent || response.result || {};
      const availList = Array.isArray(data.available) ? data.available.join(', ') : '';
      const missList = Array.isArray(data.missing) ? data.missing.join(', ') : '';
      const available = availList || 'none';
      const missing = missList || 'none';
      const speakOutput = `Available: ${available}. Missing: ${missing}.`;
      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    } catch (e) {
      clientConnected = false;
      const speakOutput = 'Sorry, I could not check the pantry right now.';
      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    }
  },
};

export const LaunchRequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput: HandlerInput) {
    const speakOutput = 'Welcome to HomeRelay. You can ask me to check the pantry for ingredients.';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

export const HelpIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput: HandlerInput) {
    const speakOutput = 'You can ask me to check if you have ingredients in the pantry, like: do I have chicken, rice, and broccoli?';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

export const CancelAndStopIntentHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
       handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
       handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NavigateHomeIntent');
  },
  handle(handlerInput: HandlerInput) {
    const speakOutput = 'Goodbye!';
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

export const SessionEndedRequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput: HandlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

export const ErrorHandler = {
  canHandle() { return true; },
  handle(handlerInput: HandlerInput, error: any) {
    console.error(error);
    return handlerInput.responseBuilder.speak('Sorry, something went wrong.').getResponse();
  },
};

export const handler = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    CheckPantryIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
