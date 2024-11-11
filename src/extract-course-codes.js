const fs = require('fs');
const pdf = require('pdf-parse');
const axios = require('axios');
const cheerio = require('cheerio');

// Function to extract course codes from a PDF
async function extractCourseCodes(pdfPath) {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const courseCodeRegex = /[A-Z]{4} \d{3}/g;
    const courseCodes = data.text.match(courseCodeRegex);
    
    return courseCodes ? [...new Set(courseCodes)] : [];
}

// Function to fetch course details from Towson's catalog
async function fetchCourseDetails(courseCode) {
    const baseUrl = 'https://catalog.towson.edu/search/?P=';
    const [department, number] = courseCode.split(' ');
    const url = `${baseUrl}${department}%20${number}`;
    
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const courseHeader = $('h3').first().text().trim();
        
        // Parse the header to extract title and credits
        // Format: "COSC 175 GEN COMPUTER SCI (4)"
        const headerRegex = /[A-Z]{4}\s+\d{3}\s+(.+?)\s+\((\d+)\)/;
        const headerMatch = courseHeader.match(headerRegex);
        const courseTitle = headerMatch ? headerMatch[1].trim() : 'No title available';
        const credits = headerMatch ? parseInt(headerMatch[2]) : null;
        
        // Extract full course text (description + prerequisites together)
        let fullText = $('p.courseblockdesc').first().text().trim();
        
        let description = fullText;
        let prerequisites = [];

        // Check if the description contains "Prerequisite" and split the description
        const prereqIndex = fullText.indexOf('Prerequisite');
        if (prereqIndex !== -1) {
            description = fullText.substring(0, prereqIndex).trim();
            const prereqText = fullText.substring(prereqIndex).trim();

            // Use a regex to extract course codes (like 'MATH 265', 'COSC 175') from the prerequisites
            const courseCodeRegex = /[A-Z]{4} \d{3}/g;
            prerequisites = prereqText.match(courseCodeRegex) || [];
        }

        return {
            courseCode,
            title: courseTitle,
            credits: credits,
            description: description || 'No description available',
            prerequisites: prerequisites.length > 0 ? prerequisites : ['None']
        };
    } catch (error) {
        console.error(`Error fetching data for ${courseCode}:`, error);
        return null;
    }
}

// Convert course details into markdown format
function formatMarkdown(courseDetails) {
    return courseDetails.map(course => {
        return `### ${course.courseCode}: ${course.title} (${course.credits} credits)\n\n` +
               `**Description:** ${course.description}\n\n` +
               `**Prerequisites:**\n${course.prerequisites.map(prereq => `- ${prereq}`).join('\n')}\n`;
    }).join('\n');
}

// Main function to extract course codes, sort them, and save to a markdown file
async function main() {
    const pdfPath = './cs-major-23-24-update.pdf';
    const outputPath = './course-details.txt';
    const courseCodes = await extractCourseCodes(pdfPath);
    const courseDetails = [];
    
    for (const courseCode of courseCodes) {
        const details = await fetchCourseDetails(courseCode);
        if (details) {
            courseDetails.push(details);
        }
    }

    courseDetails.sort((a, b) => a.courseCode.localeCompare(b.courseCode));

    const markdownOutput = formatMarkdown(courseDetails);

    fs.writeFileSync(outputPath, markdownOutput);
    console.log(`Course details saved to ${outputPath}`);
}

main();