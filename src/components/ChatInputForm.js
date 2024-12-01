import React, { useState, useRef } from 'react';
import { FaPaperclip, FaPaperPlane } from 'react-icons/fa';
import ChatDownloadButton from './ChatDownloadButton';
import PDFUploadInfo from './PDFUploadInfo';
import { parseTranscript } from '../utils/TranscriptParser';

const ChatInputForm = ({ 
    input, 
    setInput, 
    sendMessage, 
    messages, 
    loading, 
    setChatbotContext 
}) => {
    const [uploadedPDF, setUploadedPDF] = useState(null);
    const fileInputRef = useRef(null); // Reference to the file input

    const handlePDFUpload = async (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setUploadedPDF(file);

            try {
                const parsedData = await parseTranscript(file);
                setChatbotContext((prevContext) => ({
                    ...prevContext,
                    studentDetails: parsedData.studentDetails,
                    courses: parsedData.courses,
                    gpaDetails: parsedData.gpaDetails,
                }));
                console.log('Parsed Data:', parsedData);
            } catch (error) {
                console.error('Error parsing transcript:', error);
                alert('Failed to process the transcript. Please try again.');
            }
        } else {
            alert('Please upload a valid PDF file.');
        }
    };

    const handleClearPDF = () => {
        setUploadedPDF(null); // Clear the PDF state
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset the file input value
        }
    };

    return (
        <>
            <div className="chatbot-form">
                <button className="pdf-upload-icon" title="Upload a Transcript">
                    <label htmlFor="pdf-upload">
                        <FaPaperclip />
                        <input 
                            type="file" 
                            id="pdf-upload" 
                            accept=".pdf" 
                            onChange={handlePDFUpload} 
                            style={{ display: 'none' }}
                            disabled={loading}
                            ref={fileInputRef} // Attach ref to the input
                        />
                    </label>
                </button>
                <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(e);
                        }
                    }}
                    disabled={loading}
                />
                <button 
                    onClick={sendMessage} 
                    title="Submit" 
                    disabled={loading || !input.trim()}
                >
                    <FaPaperPlane />
                </button>
                <ChatDownloadButton messages={messages} />
            </div>
            {uploadedPDF && (
                <PDFUploadInfo 
                    uploadedPDF={uploadedPDF} 
                    handleClearPDF={handleClearPDF} 
                />
            )}
        </>
    );
};

export default ChatInputForm;
