const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const chatWindow = document.getElementById("chat-window");

let generatedChoices = [];
let waitingForSelection = false;
let selectedNumbers = [];

userInput.addEventListener("input", () => {
  sendBtn.disabled = !userInput.value.trim();
});

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !sendBtn.disabled) {
    sendBtn.click();
  }
});

// Function to append messages to the chat window
const appendMessage = (message, sender) => {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  messageDiv.textContent = message;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

// Function to display generated ideas
const displayChoices = (choices) => {
  const choiceContainer = document.createElement("div");
  choiceContainer.className = "choice-container";

  choices.forEach((choice, index) => {
    const choiceDiv = document.createElement("div");
    choiceDiv.className = "choice";
    choiceDiv.textContent = `${choice}`;
    choiceContainer.appendChild(choiceDiv);
  });

  chatWindow.appendChild(choiceContainer);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  appendMessage(
    "Please type a number (1-3) to select an idea. You can select up to 2 ideas. Type 'done' when finished.",
    "bot-message"
  );
  waitingForSelection = true;
  selectedNumbers = [];
};

// Function to handle idea selection from user input
const handleUserInput = async () => {
  const message = userInput.value.trim().toLowerCase();
  console.log(message);
  
  if (waitingForSelection) {
    // Handle single number input
    if (/^\d+$/.test(message)) {
      const selectedNumber = parseInt(message);
      if (selectedNumber >= 1 && selectedNumber <= 3) {
        if (selectedNumbers.includes(selectedNumber)) {
          appendMessage(
            "You've already selected this idea. Choose a different one.",
            "bot-message"
          );
        } else if (selectedNumbers.length >= 2) {
          appendMessage(
            "You can only select up to 2 ideas.",
            "bot-message"
          );
        } else {
          selectedNumbers.push(selectedNumber);
          userInput.value = "";
          await selectIdeas(selectedNumbers);
        }
      } else {
        appendMessage(
          "Please select a number between 1 and 3.",
          "bot-message"
        );
      }
    }
    // Handle "number and number" format
    else if (message.includes('and')) {
      const numbers = message.split('and')
        .map(num => parseInt(num.trim()))
        .filter(num => !isNaN(num));
      
      if (numbers.length === 2) {
        if (numbers.every(num => num >= 1 && num <= 3)) {
          if (numbers[0] === numbers[1]) {
            appendMessage(
              "Please select two different numbers.",
              "bot-message"
            );
          } else {
            selectedNumbers = numbers;
            userInput.value = "";
            await selectIdeas(selectedNumbers);
          }
        } else {
          appendMessage(
            "Please select numbers between 1 and 3.",
            "bot-message"
          );
        }
      } else {
        appendMessage(
          "Please use format like '1 and 2' or just enter a single number.",
          "bot-message"
        );
      }
    }
    // Handle other inputs as new prompts
    else if (message.length > 0) {
      waitingForSelection = false;
      selectedNumbers = [];
      await handleNewPrompt(message);
    }
  } else {
    await handleNewPrompt(message);
  }
};

// Function to handle new prompts
const handleNewPrompt = async (message) => {
  if (!message) return appendMessage("first enter any prompt", "bot-message");

  appendMessage(message, "user-message");
  sendBtn.disabled = true;

  try {
    const response = await fetch("http://localhost:8080/ai/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error("Failed to get a response from the server.");
    }

    const data = await response.json();
    generatedChoices = data.choices;
    displayChoices(generatedChoices);
  } catch (error) {
    appendMessage("Error: Unable to connect to the server.", "bot-message");
  } finally {
    userInput.value = "";
    sendBtn.disabled = false;
    userInput.focus();
  }
};

// Function to handle multiple idea selections
const selectIdeas = async (selectedNumbers) => {
  try {
    const response = await fetch("http://localhost:8080/ai/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selectedIdeas: selectedNumbers,
        choices: generatedChoices,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get a response from the server.");
    }

    const data = await response.json();

    // Display the detailed suggestion(s)
    data.detailedSuggestions.forEach((suggestion) => {
      appendMessage(`Selected Idea: ${suggestion.idea}`, "bot-message");
      appendMessage(`Details: ${suggestion.suggestion}`, "bot-message");
    });
  } catch (error) {
    appendMessage("Error: Unable to connect to the server.", "bot-message");
  }
};

sendBtn.addEventListener("click", handleUserInput);
