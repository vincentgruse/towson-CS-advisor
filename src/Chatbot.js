import React, { useState, useEffect } from 'react';
import axios from 'axios';
import courseDetails from './course-details.txt';
import './Chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState('');

    const systemMessage = {
        role: 'system',
        content: `You are a dedicated academic advisor for computer science students at Towson University. All individuals interacting with you seek information related to Towson University classes and no other universities, degree requirements, and other academic advising matters. Your primary focus is to provide accurate and relevant responses regarding prerequisites, course availability, degree requirements, and academic resources specific to the computer science program. When constructing answers, ONLY recommend classes listed in your context below, never suggest classes outside of this context.
        
        ALWAYS prioritize classes with no prerequisites. If a class has prerequisites, confirm if the user has completed the necessary prerequisite classes before suggesting it. Do not provide code snippets or any inappropriate content.
        
        Use the provided course information to deliver precise guidance on students' academic paths. If an inquiry falls outside your advising scope, politely redirect the user to appropriate resources such as the Computer Science Department advisors, university academic services, or relevant departmental websites. Maintain a professional tone and keep answers concise, ensuring they adequately address the student's questions.`
    };

    useEffect(() => {
        const fetchCourseDetails = async () => {
            try {
                const response = await axios.get(courseDetails);
                setContext(response.data);
            } catch (error) {
                console.error('Error fetching course details:', error);
            }
        };

        fetchCourseDetails();
    }, []);

    const toggleChat = () => setIsOpen(!isOpen);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);
        setInput('');

        const conversationHistory = [...messages, userMessage]
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');
        
        const fullPrompt = `${systemMessage.content}\n\nCourse Information:\n${context}\n\nConversation History:\n${conversationHistory}\n\nUser: ${input}\nAssistant:`;

        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:latest',
                    prompt: fullPrompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.95,
                        top_k: 40,
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botMessage = { role: 'assistant', content: '' };

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.response) {
                            botMessage.content += parsed.response;
                            setMessages(prev => {
                                const newMessages = [...prev];
                                // Update the last message if it's from the assistant, otherwise add new
                                if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                                    newMessages[newMessages.length - 1] = botMessage;
                                } else {
                                    newMessages.push({ ...botMessage });
                                }
                                return newMessages;
                            });
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, something went wrong. Please try again.' 
            }]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => setMessages([]);

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
                <img src="./towson-logo.png" alt="Towson Icon" className="circle-icon"/>
                AI Support Bot
            </div>
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-title">
                        <img src="./towson-logo.png" alt="Towson Icon" className="title-icon"/>
                        Towson Ai-Advisor
                        <button onClick={clearChat} className="clear-button">
                            <img src="./trash-icon.svg" alt="Clear Icon" class="clear-button-icon" />
                        </button>
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
                        <button type="submit">
                            <img src="./send-white-icon.png" alt="Send Icon" className="submit-icon" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chatbot;