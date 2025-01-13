import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// Constants
const MIN_IDEAS = 3;
const MODEL_NAME = "gemini-1.5-flash";
const PLACEHOLDER_IDEA = "Additional innovative app idea will be generated";

// Error messages
const ERROR_MESSAGES = {
  GENERATION: "Failed to generate ideas",
  SUGGESTION: "Failed to generate detailed suggestion",
  INVALID_INPUT: "Invalid input. Please provide a valid message or selection.",
  API_KEY: "Missing Gemini API key",
};

// Prompts
const PROMPTS = {
  IDEAS: (query) =>
    `Pretend you are a helpful chat-bot. Provide three concise, one-liner app ideas based on the following query: '${query}'`,
  SUGGESTION: (idea) => `
    Provide a detailed suggestion for building an app based on the following idea: "${idea}".
    The response should:
    1. List the required technologies (e.g., backend, frontend, database, etc.).
    2. Describe the recommended approach or methodology for development.
    3. Highlight any tools, frameworks, or APIs that would be helpful.
    4. Avoid providing any code snippets.
    5. Offer practical advice that would help the developer succeed.
  `,
};

// // Initialize Google Generative AI
// if (!process.env.GEMINI_API_KEY) {
//   throw new Error(ERROR_MESSAGES.API_KEY);
// }

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

/**
 * Generates app ideas based on user query
 * @param {string} query - User's input query
 * @returns {Promise<string[]>} Array of generated ideas
 */
const generateIdeas = async (query) => {
  try {
    const result = await model.generateContent(PROMPTS.IDEAS(query));
    const generatedIdeas = result.response
      .text()
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((idea) => idea.replace(/^\d+\.\s*/, "")); // Remove any numbering

    // Ensure minimum number of ideas
    while (generatedIdeas.length < MIN_IDEAS) {
      generatedIdeas.push(PLACEHOLDER_IDEA);
    }

    return generatedIdeas.slice(0, MIN_IDEAS);
  } catch (error) {
    console.error("Error generating ideas:", error);
    throw new Error(ERROR_MESSAGES.GENERATION);
  }
};

/**
 * Generates detailed suggestion for an app idea
 * @param {string} idea - Selected app idea
 * @returns {Promise<string>} Detailed suggestion
 */
const generateDetailedSuggestion = async (idea) => {
  try {
    const result = await model.generateContent(PROMPTS.SUGGESTION(idea));
    return result.response.text();
  } catch (error) {
    console.error("Error generating detailed suggestion:", error);
    throw new Error(ERROR_MESSAGES.SUGGESTION);
  }
};

/**
 * Validates and sanitizes the selected ideas
 * @param {number[]} selectedIdeas - Array of selected idea indices
 * @param {string[]} choices - Available choices
 * @returns {boolean} Validation result
 */
const validateSelection = (selectedIdeas, choices) => {
  return (
    Array.isArray(selectedIdeas) &&
    selectedIdeas.every(
      (index) => Number.isInteger(index) && index > 0 && index <= choices.length
    )
  );
};

/**
 * Main controller for handling AI requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const aiController = async (req, res) => {
  try {
    const { message, selectedIdeas, choices } = req.body;
    // Handle initial query
    if (message && typeof message === "string") {
      const ideas = await generateIdeas(message);
      return res.status(200).json({
        query: message,
        choices: ideas.map((idea, index) => `${index + 1}. ${idea}`),
        prompt:
          "Please choose one or more ideas by typing their numbers (e.g., 1, 2).",
      });
    }

    // Handle idea selection
    if (selectedIdeas && choices) {
      if (!validateSelection(selectedIdeas, choices)) {
        return res.status(400).json({ error: ERROR_MESSAGES.INVALID_INPUT });
      }

      const detailedSuggestions = await Promise.all(
        selectedIdeas.map(async (selectedIndex) => ({
          idea: choices[selectedIndex - 1],
          suggestion: await generateDetailedSuggestion(
            choices[selectedIndex - 1]
          ),
        }))
      );

      return res.status(200).json({ detailedSuggestions });
    }

    return res.status(400).json({ error: ERROR_MESSAGES.INVALID_INPUT });
  } catch (error) {
    console.error("Controller error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export default aiController;
