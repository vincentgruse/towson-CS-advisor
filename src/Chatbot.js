import React, { useState, useEffect } from 'react';
import axios from 'axios';
import parsedCourses from './parsed_courses.json';
import './Chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState([]);

    const systemMessage = {
        role: 'system',
        content: `You are a dedicated academic advisor for computer science students at Towson University. All individuals interacting with you seek information related to Towson University classes, degree requirements, and other academic advising matters. Your primary focus is to provide accurate and relevant responses regarding prerequisites, course availability, degree requirements, and academic resources specific to the computer science program. When constructing answers, ONLY recommend classes based on your context and refrain from suggesting classes outside your scope. ALWAYS prioritize classes with no prerequisites. If a class has prerequisites, first confirm whether the user has completed the necessary prerequisite classes before suggesting it. You must not recommend a class unless the prerequisite requirements have been met. You should not provide code snippets or any inappropriate content. Utilize the provided course information to deliver precise guidance on students’ academic paths. If an inquiry falls outside your advising scope, politely redirect the user to appropriate resources such as the Computer Science Department advisors, university academic services, or relevant departmental websites. Maintain a professional tone and keep answers concise, ensuring they adequately address the student's questions. Your goal is to assist students in making informed academic decisions and navigating their educational journey at Towson University effectively. Always encourage students to seek further assistance from official university resources if needed.`
    };

    useEffect(() => {
        setContext(parsedCourses);
    }, []);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const sendMessage = async (e) => {
    e.preventDefault();
    if (!input) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    const conversationHistory = [...messages, userMessage].map(msg => `${msg.role}: ${msg.content}`).join('\n');
    
    const fullPrompt = `${systemMessage.content}\n\nCourse Information:\n${JSON.stringify(context, null, 2)}\n\nConversation History:\n${conversationHistory}\n\nUser: ${input}\nAssistant:`;

    const payload = {
        model: 'llama3.2:latest',
        prompt: fullPrompt,
        stream: false,
        options: {
            temperature: 0.7,
            top_p: 0.95,
            top_k: 40,
        }
    };

    setLoading(true);
    setInput('');

    try {
        console.log('Sending payload:', payload);
        const response = await axios.post('http://localhost:11434/api/generate', payload);
        console.log('Received response:', response.data);
        
        if (response.data && response.data.response) {
            const botMessage = { 
                role: 'assistant', 
                content: response.data.response 
            };
            setMessages((prevMessages) => [...prevMessages, botMessage]);
        } else {
            throw new Error('Invalid response format');
        }
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
