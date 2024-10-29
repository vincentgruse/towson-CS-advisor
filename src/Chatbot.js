import React, { useState } from 'react';
import axios from 'axios';
import './Chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input) return;

        const userMessage = { role: 'user', content: input };
        setMessages((prevMessages) => [...prevMessages, userMessage]);

        const payload = {
            model: 'llama3.2:1b',
            prompt: input,
            stream: false,
            context: [],
            options: {
                temperature: 0.7,
                top_p: 0.95,
                top_k: 40,
            }
        };

        setLoading(true);
        setInput('');

        try {
            const response = await axios.post('http://localhost:11434/api/generate', payload);
            const botMessage = { 
                role: 'assistant', 
                content: response.data.response 
            };
            setMessages((prevMessages) => [...prevMessages, botMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = { 
                role: 'assistant', 
                content: 'Sorry, something went wrong. Please try again.' 
            };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

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
    
    

    return (
        <div className="chatbot-container">
            <div className="chatbot-circle" onClick={toggleChat}>
                AI Support Bot
            </div>
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-title">
                        Towson Ai-Advisor
                        <button onClick={clearChat} className="clear-button">Clear</button>
                    </div>
                    <div className="messages">
                        {messages.length === 0 ? (
                            <div className="placeholder-message">
                                Ask an advising question to the AI advisor tool...
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <div 
                                    key={index} 
                                    className={`message-container ${msg.role === 'user' ? 'user-message' : 'bot-message'}`}
                                >
                                    <div className={msg.role === 'user' ? 'user' : 'bot'}>
                                        {formatMessage(msg.content)}
                                    </div>
                                </div>
                            ))
                        )}
                        {loading && <div className="loading">Typing...</div>}
                    </div>
                    <form onSubmit={sendMessage} className="chatbot-form">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                        />
                        <button type="submit">Send</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
