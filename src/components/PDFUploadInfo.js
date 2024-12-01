import React from 'react';

const PDFUploadInfo = ({ uploadedPDF, handleClearPDF }) => {
    return (
        <div className="uploaded-pdf-info">
            <span>📄{uploadedPDF.name}</span>
            <button onClick={handleClearPDF}>×</button>
        </div>
    );
};

export default PDFUploadInfo;
