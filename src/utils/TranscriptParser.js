import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import 'pdfjs-dist/legacy/build/pdf.worker';

export const parseTranscript = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let transcriptText = '';

        // Extract text from all pages
        for (let i = 0; i < pdf.numPages; i++) {
            const page = await pdf.getPage(i + 1);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            transcriptText += `\n${pageText}`;
        }

        // Extract student details
        const nameMatch = transcriptText.match(/Name:\s+(.*)/);
        const idMatch = transcriptText.match(/Student ID:\s+(\d+)/);
        const programMatch = transcriptText.match(/Program:\s+(.*)/);
        const subplanMatch = transcriptText.match(/Subplan:\s+(.*)/);

        const studentDetails = {
            name: nameMatch ? nameMatch[1].trim() : '',
            studentId: idMatch ? idMatch[1].trim() : '',
            program: programMatch ? programMatch[1].trim() : '',
            subplan: subplanMatch ? subplanMatch[1].trim() : '',
        };

        // Extract course details
        const courses = [];
        const courseRegex = /([A-Z]{4}\s+\d+)\s+(.*?)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+([A-F][+-]?|S)\s+(\d+\.\d+)/g;
        let match;
        while ((match = courseRegex.exec(transcriptText)) !== null) {
            courses.push({
                code: match[1],
                title: match[2],
                attemptedCredits: parseFloat(match[3]),
                earnedCredits: parseFloat(match[4]),
                grade: match[5],
                gradePoints: parseFloat(match[6]),
            });
        }

        // Extract GPA details
        const gpaMatch = transcriptText.match(/Cumulative GPA:\s+([\d.]+)/);
        const totalCreditsMatch = transcriptText.match(/Cumulative Totals:\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);

        const gpaDetails = {
            cumGPA: gpaMatch ? parseFloat(gpaMatch[1]) : 0,
            totalAttempted: totalCreditsMatch ? parseFloat(totalCreditsMatch[1]) : 0,
            totalEarned: totalCreditsMatch ? parseFloat(totalCreditsMatch[2]) : 0,
        };

        return { 
            rawText: transcriptText, 
            studentDetails, 
            courses, 
            gpaDetails 
        };
    } catch (error) {
        console.error('Error parsing transcript:', error);
        throw error;
    }
};