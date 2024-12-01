import React, { useState, Suspense } from 'react';
import Fuse from 'fuse.js';
import './Chatbot.css';
import ContextLoader from './ContextLoader';

const ChatbotWindow = React.lazy(() => import('./ChatbotWindow'));

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [contextLoaded, setContextLoaded] = useState(false);
    const [courseContext, setCourseContext] = useState({});
    const [programContext, setProgramContext] = useState({});
    const [uploadedPDF, setUploadedPDF] = useState(null);
    const [studentContext, setStudentContext] = useState(null);

    const systemMessage = {
        role: 'system',
        content: `You are "Stripe," a friendly and knowledgeable academic advisor for Towson University's Computer Science Department. Your role is to assist students by providing concise and precise guidance based strictly on the provided course catalog, program requirements, and any parsed information from student transcripts.
    
        When responding to queries:
        1. Keep responses between **50 to 150 words** based on the complexity of the query.
        2. Provide only the most **actionable and relevant information** for the user.
        3. When discussing courses, always include the full course code and title, along with a brief description and prerequisites (if applicable).
        4. Include line breaks or bulletpoints to improve readability when possible.
        
        Avoid lengthy explanations or overly detailed responses. If additional details are necessary, encourage the user to ask follow-up questions. Never suggest courses that are not explicitly listed in the system's provided context. Your goal is to provide clear, professional, and helpful advice in a concise manner.`
    };
    
    

    const addMessage = (role, content) => {
        setMessages((prev) => [...prev, { role, content }]);
    };

    const getRelevantCourseInfo = (input) => {
        const fuse = new Fuse(Object.entries(courseContext), {
            keys: ['0', '1.title', '1.description', '1.prerequisites'],
            threshold: 0.3,
            includeScore: true
        });
    
        // Check explicitly for course codes
        const courseCodeRegex = /\b[A-Z]{4}\s*\d{3}\b/i;
        const courseCodeMatch = input.match(courseCodeRegex);
    
        if (courseCodeMatch) {
            const exactMatch = Object.entries(courseContext).find(([code]) =>
                code.toLowerCase() === courseCodeMatch[0].toLowerCase()
            );
    
            if (exactMatch) {
                return exactMatch; // Return the exact course code match if found
            }
        }
    
        // Fallback to fuzzy search
        const results = fuse.search(input);
    
        if (results.length > 0) {
            results.sort((a, b) => a.score - b.score);
            return results[0].item;
        }
    
        return null;
    };
    

    const getRelevantProgramInfo = (input) => {
        const fuse = new Fuse(Object.entries(programContext), {
            keys: ['0', '1'],
            threshold: 0.3
        });
        const results = fuse.search(input);
        return results.length > 0 ? results[0].item : null;
    };

    const sendMessage = async (e) => {
        e.preventDefault();
    
        const userMessage = { role: 'user', content: input };
        addMessage('user', input);
        setLoading(true);
        setInput('');
    
        if (!contextLoaded) {
            addMessage('assistant', 'Details are not fully loaded yet. Please wait a moment and try again.');
            setLoading(false);
            return;
        }
    
        const relevantCourse = getRelevantCourseInfo(input);
        const relevantProgram = getRelevantProgramInfo(input);
        const isTranscriptQuery = /transcript|gpa|courses taken|student details/i.test(input); // Detect transcript queries
    
        let responseSnippet = '';
    
        if (relevantCourse) {
            const [code, details] = relevantCourse;
            responseSnippet = `
                Relevant Course Found:
                Course Code: ${code}
                Title: ${details.title}
                Credits: ${details.credits}
                
                Detailed Course Information:
                ${details.description}
                
                Prerequisites: ${details.prerequisites.length > 0 
                    ? details.prerequisites.join(', ') 
                    : 'No specific prerequisites'}
            `;
        } else if (relevantProgram) {
            const [section, content] = relevantProgram;
            responseSnippet = `
                Relevant Program Information:
                Section: ${section}
                
                Details:
                ${content}
            `;
        } else if (isTranscriptQuery && studentContext) {
            responseSnippet = `
                Based on the uploaded transcript, here are some details:
                Student Name: ${studentContext.studentDetails.name}
                Program: ${studentContext.studentDetails.program}
                Cumulative GPA: ${studentContext.gpaDetails.cumGPA}
                
                Courses Taken:
                ${studentContext.courses
                    .map((course) => `${course.code} - ${course.title} (${course.grade})`)
                    .join('\n')}
            `;
        } else {
            // If no relevant context is found, provide a fallback response
            responseSnippet = `
                I'm sorry, I couldn't find any information matching your query in the provided context. 
                Please try rephrasing your question or asking about specific courses, programs, or transcript details.
            `;
        }
    
        // Final prompt construction for the model
        const conversationHistory = [...messages, userMessage]
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join('\n');
    
        const fullPrompt = `${systemMessage.content}
        
            ${responseSnippet}
            
            Conversation History:
            ${conversationHistory}
            
            Assistant:`;
    
        try {
            const response = await fetch(process.env.REACT_APP_API_URL || 'http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:latest',
                    prompt: fullPrompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.95,
                        top_k: 40
                    }
                })
            });
    
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
            const result = await response.json();
            addMessage('assistant', result.response);
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage('assistant', 'Sorry, something went wrong. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <div className="chatbot-container">
            <ContextLoader
                setCourseContext={setCourseContext}
                setProgramContext={setProgramContext}
                setContextLoaded={setContextLoaded}
                addMessage={addMessage}
                studentTranscript={uploadedPDF} // Pass the uploaded transcript
                setStudentContext={setStudentContext} // Update context with parsed data
            />
            <div
                className="chatbot-circle"
                role="button"
                aria-label="Open chatbot"
                onClick={() => setIsOpen(!isOpen)}
            >
                <img src="./towson-logo.png" alt="Towson Icon" className="circle-icon" />
                Towson Stripe Advisor
            </div>
            {isOpen && (
                <Suspense fallback={<div>Loading...</div>}>
                    <ChatbotWindow
                        messages={messages}
                        input={input}
                        loading={loading}
                        setInput={setInput}
                        sendMessage={sendMessage}
                        clearChat={clearChat}
                        handlePDFUpload={(file) => setUploadedPDF(file)}
                        uploadedPDF={uploadedPDF}
                        setUploadedPDF={setUploadedPDF}
                        setChatbotContext={setStudentContext}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default Chatbot;
