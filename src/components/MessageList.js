import React from 'react';

const MessageList = ({ messages, loading, formatMessage }) => {
    return (
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
    );
};

export default MessageList;