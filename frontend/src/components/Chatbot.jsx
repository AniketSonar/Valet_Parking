import { useState } from "react";
import "./Chatbot.css";

function Chatbot({ onClose }) {
  const [messages, setMessages] = useState([
    {
      type: "bot",
      text: "Hi! 👋 I'm Aura Assistant. How can I help you today?"
    }
  ]);

  const [input, setInput] = useState("");

  const getResponse = (message) => {
    const text = message.toLowerCase();

    if (
      text.includes("park") ||
      text.includes("parking")
    ) {
      return "To park your vehicle, please arrive at the valet entrance. Our Reception/Security team will register your vehicle, create a parking ticket, record the key, inspect the vehicle, and assign a valet.";
    }

    if (
      text.includes("request") ||
      text.includes("retrieve") ||
      text.includes("vehicle")
    ) {
      return "You can request your vehicle through the customer portal or contact Reception/Security. Your request will be assigned to a valet who will retrieve and prepare your vehicle.";
    }

    if (
      text.includes("payment") ||
      text.includes("pay") ||
      text.includes("invoice")
    ) {
      return "Payments are handled by the Cashier. You can pay by cash or online, and an invoice is generated after payment.";
    }

    if (
      text.includes("key") ||
      text.includes("keys")
    ) {
      return "Your vehicle key is received and securely tracked by Reception/Security. It is handed to the assigned valet when your vehicle needs to be parked or retrieved.";
    }

    if (
      text.includes("support") ||
      text.includes("help") ||
      text.includes("contact")
    ) {
      return "For further assistance, please contact the Aura reception or support desk.";
    }

    return "I can help you with parking, vehicle retrieval, payments, invoices, key management, and support. Please tell me what you need help with.";
  };

  const sendMessage = (message) => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        type: "user",
        text: trimmedMessage
      },
      {
        type: "bot",
        text: getResponse(trimmedMessage)
      }
    ]);

    setInput("");
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSend();
    }
  };

  const handleOptionClick = (question) => {
    sendMessage(question);
  };

  return (
    <div className="chatbot">
      <div className="chatbot-header">
        <div>
          <h3>Aura Assistant</h3>
          <span>Here to help you</span>
        </div>

        <button
          type="button"
          className="chatbot-close"
          onClick={onClose}
          aria-label="Close chatbot"
        >
          ×
        </button>
      </div>

      <div className="chatbot-body">
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.type === "bot"
                ? "bot-message"
                : "user-message"
            }
          >
            {message.text}
          </div>
        ))}

        {messages.length === 1 && (
          <div className="chatbot-options">
            <button
              type="button"
              onClick={() =>
                handleOptionClick(
                  "How do I park my vehicle?"
                )
              }
            >
              How do I park my vehicle?
            </button>

            <button
              type="button"
              onClick={() =>
                handleOptionClick(
                  "How can I request my vehicle?"
                )
              }
            >
              How can I request my vehicle?
            </button>

            <button
              type="button"
              onClick={() =>
                handleOptionClick(
                  "I need help with payment"
                )
              }
            >
              I need help with payment
            </button>

            <button
              type="button"
              onClick={() =>
                handleOptionClick(
                  "Contact support"
                )
              }
            >
              Contact support
            </button>
          </div>
        )}
      </div>

      <div className="chatbot-input">
        <input
          type="text"
          value={input}
          onChange={(event) =>
            setInput(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
        />

        <button
          type="button"
          onClick={handleSend}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default Chatbot;