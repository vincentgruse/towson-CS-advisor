import React, { useEffect, useRef } from 'react';
import { FaTrash } from 'react-icons/fa';
import MessageList from './MessageList';
import ChatInputForm from './ChatInputForm';

const formatMessage = (message) => {
    const formattedMessage = message.split('\n').map((line, index) => {
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
        return (
            <span key={index}>
                {parts}
                <br />
            </span>
        );
    });

    return formattedMessage;
};

const ChatbotWindow = ({ 
    messages, 
    input, 
    loading,
    setInput, 
    sendMessage,
    clearChat,
    setChatbotContext
}) => {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Scroll to the bottom when messages change
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <div className="chatbot-window">
            <div className="chatbot-title">
                <a href="https://www.towson.edu" target="_blank" rel="noopener noreferrer">
                    <img src="./towson-logo.png" alt="Towson Icon" className="title-icon" />
                </a>
                Towson Stripe Advisor
                <button onClick={clearChat} className="clear-button" title="Clear Chat History">
                    <FaTrash />
                </button>
            </div>
            <div className="messages">
                <MessageList 
                    messages={messages} 
                    loading={loading} 
                    formatMessage={formatMessage}
                />
                <div ref={messagesEndRef} />
            </div>
            <ChatInputForm 
                input={input} 
                setInput={setInput} 
                sendMessage={sendMessage}
                messages={messages}
                loading={loading}
                setChatbotContext={setChatbotContext}
            />
        </div>
    );
};

export default ChatbotWindow;
