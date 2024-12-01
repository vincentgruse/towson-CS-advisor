import React from 'react';
import { FaDownload } from 'react-icons/fa';
import './Chatbot.css';

const ChatDownloadButton = ({ messages }) => {
    const downloadChatHistory = () => {
        const chatHistoryText = messages.map(msg => 
            `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`
        ).join('\n\n');

        const blob = new Blob([chatHistoryText], { type: 'text/plain' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
        link.download = `towson-chat-history-${timestamp}.txt`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(link.href);
    };

    return (
        <button 
            className="download-button"
            onClick={downloadChatHistory} 
            title="Download Chat History"
            disabled={messages.length === 0}
        >
            <FaDownload />
        </button>
    );
};

export default ChatDownloadButton;