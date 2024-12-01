import { useEffect, useCallback, useRef } from 'react';
import { parseTranscript } from '../utils/TranscriptParser';

const ContextLoader = ({
    setCourseContext,
    setProgramContext,
    setContextLoaded,
    addMessage,
    studentTranscript,
    setStudentContext
}) => {
    const isInitialized = useRef(false);
    const isTranscriptParsed = useRef(false);

    const loadFile = useCallback(async (fileUrl) => {
        try {
            console.log(`Attempting to load file: ${fileUrl}`);
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${fileUrl}: ${response.statusText}`);
            }
            console.log(`File loaded successfully: ${fileUrl}`);
            return response.text();
        } catch (error) {
            console.error(`Error loading file: ${fileUrl}`, error);
            throw error;
        }
    }, []);

    const parseCourseDetails = useCallback((data) => {
        console.log('Parsing course details...');
        const courses = {};
        const courseBlocks = data.split('###').filter(Boolean);

        courseBlocks.forEach((block) => {
            try {
                const lines = block.split('\n').filter(Boolean);
                const headerMatch = lines[0].match(/([A-Z]+\s\d+):\s(.+)\s\((\d+)\scredits\)/);

                if (headerMatch) {
                    const code = headerMatch[1].trim();
                    const title = headerMatch[2].trim();
                    const credits = headerMatch[3].trim();
                    const description = lines
                        .find((line) => line.startsWith('**Description:**'))
                        ?.replace('**Description:** ', '')
                        .trim() || '';
                    const prerequisites = lines
                        .find((line) => line.startsWith('**Prerequisites:**'))
                        ?.replace('**Prerequisites:**', '')
                        .split('\n')
                        .flatMap((pr) => pr.split(','))
                        .map((pr) => pr.trim())
                        .filter(Boolean) || [];

                    courses[code] = { title, credits, description, prerequisites };
                } else {
                    console.warn('Could not parse course block:', block);
                }
            } catch (error) {
                console.error('Error parsing course block:', block, error);
            }
        });

        console.log(`Parsed ${Object.keys(courses).length} courses successfully.`);
        return courses;
    }, []);

    const parseProgramDetails = useCallback((data) => {
        console.log('Parsing program details...');
        const sections = data.split('---').map(section => section.trim());
        const parsedPrograms = sections.reduce((acc, section) => {
            const [title, ...content] = section.split('\n').filter(Boolean);
            acc[title] = content.join('\n');
            return acc;
        }, {});

        console.log(`Parsed ${Object.keys(parsedPrograms).length} program sections successfully.`);
        return parsedPrograms;
    }, []);

    const parseStudentTranscript = useCallback(async () => {
        if (!studentTranscript || isTranscriptParsed.current) {
            console.log('No transcript provided or already parsed, skipping transcript parsing.');
            return;
        }

        try {
            console.log('Parsing student transcript...');
            const parsedData = await parseTranscript(studentTranscript);
            setStudentContext(parsedData);
            isTranscriptParsed.current = true;
            console.log('Student transcript parsed successfully:', parsedData);

            addMessage(
                'assistant',
                `Student transcript processed successfully: ${parsedData.studentDetails.name} is enrolled in ${parsedData.studentDetails.program}.`
            );
        } catch (error) {
            console.error('Error parsing transcript:', error);
            addMessage('assistant', 'Failed to process the transcript. Please try again.');
        }
    }, [studentTranscript, setStudentContext, addMessage]);

    // Initial context loading
    useEffect(() => {
        if (isInitialized.current) return;

        const initializeContext = async () => {
            try {
                console.log('Initializing context...');
                const courseText = await loadFile('/course-desc.txt');
                const programText = await loadFile('/ms-degree-requirements.txt');

                const parsedCourses = parseCourseDetails(courseText);
                const parsedProgram = parseProgramDetails(programText);

                setCourseContext(parsedCourses);
                setProgramContext(parsedProgram);
                setContextLoaded(true);
                isInitialized.current = true;

                console.log('Context initialized successfully.');
            } catch (error) {
                console.error('Error initializing context:', error);
                addMessage('assistant', 'Failed to load program details. Please try again later.');
            }
        };

        initializeContext();
    }, [
        loadFile, 
        parseCourseDetails, 
        parseProgramDetails, 
        setCourseContext, 
        setProgramContext, 
        setContextLoaded, 
        addMessage
    ]);

    // Transcript parsing
    useEffect(() => {
        if (studentTranscript && !isTranscriptParsed.current) {
            parseStudentTranscript();
        }
    }, [studentTranscript, parseStudentTranscript]);

    return null;
};

export default ContextLoader;