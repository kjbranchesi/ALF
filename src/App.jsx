import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

// --- V14: ALL PROMPT IMPORTS ---
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { collection, addDoc, doc, getDocs, getDoc, setDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { basePrompt } from './prompts/base_prompt.js';
import { intakePrompt } from './prompts/intake_prompt.js';
import { safetyCheckPrompt } from './prompts/safety_check_prompt.js';
import { assignmentGeneratorPrompt } from './prompts/assignment_generator_prompt.js';
import { rubricGeneratorPrompt } from './prompts/rubric_generator_prompt.js';
import { critiqueGeneratorPrompt } from './prompts/critique_generator_prompt.js';
import { exampleFinderPrompt } from './prompts/example_finder_prompt.js'; // V14 Import
import { earlyPrimaryPrompt } from './prompts/early_primary_prompt.js';
import { primaryPrompt } from './prompts/primary_prompt.js';
import { middleSchoolPrompt } from './prompts/middle_school_prompt.js';
import { highSchoolPrompt } from './prompts/high_school_prompt.js';
import { universityPrompt } from './prompts/university_prompt.js';
import { imageGeneratorPrompt } from './prompts/image_generator_prompt.js';

// --- STYLING & ICONS ---
const styles = {
  appContainer: { fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column', height: '100vh' },
  header: { backgroundColor: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10, flexShrink: 0 },
  headerTitleContainer: { display: 'flex', flexDirection: 'column' },
  headerTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  headerSlogan: { fontSize: '0.875rem', color: '#6b7280', margin: 0, marginTop: '4px' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '12px' },
  newProjectButton: { backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' },
  authButton: { backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: '1px solid #4f46e5', cursor: 'pointer', transition: 'background-color 0.2s' },
  mainContent: { flex: 1, overflowY: 'auto', width: '100%' },
  contentWrapper: { width: '100%', maxWidth: '1024px', margin: '0 auto', padding: '24px' },
  footer: { backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: '16px', flexShrink: 0 },
  inputArea: { maxWidth: '1024px', margin: '0 auto', display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '8px' },
  textarea: { width: '100%', backgroundColor: 'transparent', padding: '8px', color: '#1f2937', border: 'none', outline: 'none', resize: 'none', fontSize: '1rem' },
  sendButton: { padding: '12px', borderRadius: '50%', backgroundColor: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' },
  sendButtonDisabled: { backgroundColor: '#9ca3af', cursor: 'not-allowed' },
  messageContainer: (isBot) => ({ display: 'flex', alignItems: 'flex-start', gap: '12px', margin: '16px 0', justifyContent: isBot ? 'flex-start' : 'flex-end' }),
  iconContainer: { flexShrink: 0, backgroundColor: '#e5e7eb', borderRadius: '50%', padding: '8px', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  messageBubble: (isBot) => ({ maxWidth: '80%', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: isBot ? '#eef2ff' : 'white', color: '#1f2937', wordWrap: 'break-word', borderTopLeftRadius: isBot ? '0px' : '12px', borderTopRightRadius: isBot ? '12px' : '0px', lineHeight: 1.7 }),
  centeredContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center' },
  dashboardContainer: { backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '1024px' },
  projectList: { listStyle: 'none', padding: 0, margin: '24px 0' },
  projectItem: { textAlign: 'left', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px', cursor: 'pointer', transition: 'background-color 0.2s' },
  button: { backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' },
  summaryContainer: { backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  summaryActions: { marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' },
  actionButton: { flex: 1, minWidth: '150px', backgroundColor: '#6b7280', color: 'white', fontWeight: 'bold', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' },
  searchResultCard: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white', marginTop: '12px' },
  searchResultTitle: { fontWeight: 'bold', color: '#4f46e5', textDecoration: 'none' },
  searchResultSnippet: { fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' },
  generatedImage: { maxWidth: '100%', height: 'auto', borderRadius: '8px', marginTop: '12px' },
  loadingSpinner: { border: '4px solid #f3f3f3', borderTop: '4px solid #4f46e5', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '16px auto' },
};

const keyframes = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
const styleSheet = document.createElement("style");
styleSheet.innerText = keyframes;
document.head.appendChild(styleSheet);

const BotIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#4f46e5'}} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zM7 7a3 3 0 016 0v2H7V7z" /></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#6b7280'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '24px', width: '24px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);

const renderMarkdown = (text) => {
    if (typeof text !== 'string') return { __html: '' };
    const rawMarkup = marked(text, { breaks: true, gfm: true });
    return { __html: rawMarkup };
};

const ChatMessage = ({ message }) => {
    const { text, sender, searchResults, imageUrl, isLoadingImage } = message;
    const isBot = sender === 'bot';
    return (
        <div style={styles.messageContainer(isBot)}>
            {isBot && <div style={styles.iconContainer}><BotIcon /></div>}
            <div style={{...styles.messageBubble(isBot), paddingBottom: searchResults ? '8px' : '16px' }}>
                <div dangerouslySetInnerHTML={renderMarkdown(text)} />
                {searchResults && (<div>{searchResults.map((result, index) => (<SearchResultCard key={index} result={result} />))}</div>)}
                {isLoadingImage && <div style={styles.loadingSpinner}></div>}
                {imageUrl && <img src={imageUrl} alt="Generated concept art" style={styles.generatedImage} />}
            </div>
            {!isBot && <div style={styles.iconContainer}><UserIcon /></div>}
        </div>
    );
};

const FinalSummaryDisplay = ({ finalDocument, onRestart, onGenerateRubric, onGetFeedback, onFindExamples, stage }) => {
    const [copySuccess, setCopySuccess] = useState('');
    const handleCopy = () => {
        navigator.clipboard.writeText(finalDocument).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };
    return (
        <div style={styles.summaryContainer}>
            <div dangerouslySetInnerHTML={renderMarkdown(finalDocument)} />
            <div style={styles.summaryActions}>
                {stage === 'finished_assignments' && (
                    <button onClick={onGenerateRubric} style={{...styles.actionButton, backgroundColor: '#4f46e5' }}>Design Rubric</button>
                )}
                 {stage === 'finished_project' && (
                    <>
                        <button onClick={onGetFeedback} style={{...styles.actionButton, backgroundColor: '#10b981' }}>Get Feedback</button>
                        <button onClick={onFindExamples} style={{...styles.actionButton, backgroundColor: '#f59e0b' }}>Find Examples</button>
                    </>
                )}
                <button onClick={handleCopy} style={styles.actionButton}>{copySuccess || 'Copy to Clipboard'}</button>
                <button onClick={onRestart} style={styles.actionButton}>Back to Dashboard</button>
            </div>
        </div>
    );
};

export default function App() {
    // --- STATE & REFS ---
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [projects, setProjects] = useState([]);
    const [currentProjectId, setCurrentProjectId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [conversationStage, setConversationStage] = useState('welcome');
    const [ageGroup, setAgeGroup] = useState('');
    const [ageGroupPrompt, setAgeGroupPrompt] = useState('');
    const [finalCurriculumText, setFinalCurriculumText] = useState('');
    const [finalAssignmentsText, setFinalAssignmentsText] = useState('');
    const [finalProjectDocument, setFinalProjectDocument] = useState('');
    const inputRef = useRef(null);
    const chatEndRef = useRef(null);
    
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const googleSearchApiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
    const googleSearchCx = import.meta.env.VITE_GOOGLE_SEARCH_CX;

    // --- EFFECTS ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            if (user) fetchProjects(user.uid);
            else { setProjects([]); setCurrentProjectId(null); }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (currentProjectId && user && conversationHistory.length > 0) {
            saveConversation();
        }
    }, [conversationHistory, conversationStage]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (inputRef.current) inputRef.current.focus();
    }, [messages, isBotTyping]);

    // --- DATABASE & AUTH FUNCTIONS ---
    const handleSignIn = async () => { try { await signInAnonymously(auth); } catch (error) { console.error("Sign in error:", error); } };
    const handleSignOut = async () => { await signOut(auth); setCurrentProjectId(null); setMessages([]); setConversationHistory([]); setConversationStage('welcome'); };
    
    const fetchProjects = async (uid) => {
        const projectsCol = collection(db, 'users', uid, 'projects');
        const q = query(projectsCol, orderBy('lastUpdated', 'desc'));
        const projectSnapshot = await getDocs(q);
        setProjects(projectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    
    const handleStartNewProject = () => {
        setMessages([{ text: "Welcome to the ALF Coach! I'm your partner in creative curriculum design. To get started, what age or grade level are you designing for?", sender: 'bot', id: Date.now() }]);
        setConversationHistory([]);
        setConversationStage('select_age');
        setCurrentProjectId(`temp_${Date.now()}`); 
        setFinalCurriculumText('');
        setFinalAssignmentsText('');
        setFinalProjectDocument('');
        setAgeGroup('');
        setAgeGroupPrompt('');
    };

    const loadProject = async (projectId) => {
        if (!user) return;
        const projectDocRef = doc(db, 'users', user.uid, 'projects', projectId);
        const projectSnap = await getDoc(projectDocRef);
        if (projectSnap.exists()) {
            const projectData = projectSnap.data();
            setConversationHistory(projectData.history || []);
            setMessages((projectData.history || [])
                .filter(turn => !(turn.role === 'user' && turn.parts[0].text.includes('# META-INSTRUCTION')))
                .map((turn, index) => ({ text: turn.parts[0].text, sender: turn.role === 'user' ? 'user' : 'bot', id: `${projectId}_${index}` })));
            setConversationStage(projectData.stage || 'welcome');
            setAgeGroup(projectData.ageGroup || '');
            setAgeGroupPrompt(projectData.ageGroupPrompt || '');
            setFinalCurriculumText(projectData.finalCurriculumText || '');
            setFinalAssignmentsText(projectData.finalAssignmentsText || '');
            setFinalProjectDocument(projectData.finalProjectDocument || '');
            setCurrentProjectId(projectId);
        }
    };
    
    const saveConversation = async () => {
        if (!user || !currentProjectId) return;
        const projectData = { 
            history: conversationHistory, 
            lastUpdated: serverTimestamp(), 
            title: conversationHistory.find(h => h.role === 'user' && h.parts[0].text.includes('idea'))?.parts[0].text.substring(0, 50) || 'New Project', 
            stage: conversationStage,
            ageGroup,
            ageGroupPrompt,
            finalCurriculumText,
            finalAssignmentsText,
            finalProjectDocument,
        };
        if (currentProjectId.startsWith('temp_')) {
            const projectsCol = collection(db, 'users', user.uid, 'projects');
            const docRef = await addDoc(projectsCol, projectData);
            setCurrentProjectId(docRef.id);
        } else {
            const projectDocRef = doc(db, 'users', user.uid, 'projects', currentProjectId);
            await setDoc(projectDocRef, projectData, { merge: true });
        }
    };

    // --- API & RESPONSE LOGIC ---
    const callGeminiApi = async (payload) => {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Gemini API call failed: ${response.status}`);
        return await response.json();
    };

    const callImagenApi = async (prompt) => {
        const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiApiKey}`;
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Imagen API call failed: ${response.status}`);
        const result = await response.json();
        return result.predictions?.[0]?.bytesBase64Encoded ? `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}` : null;
    };

    const performGoogleSearch = async (queries) => {
        const query = encodeURIComponent(queries.join(" "));
        const url = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${googleSearchCx}&q=${query}&num=3`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Google Search API failed: ${response.status}`);
            const data = await response.json();
            return data.items.map(item => ({ url: item.link, source_title: item.title, snippet: item.snippet }));
        } catch (error) {
            console.error("Google Search failed:", error);
            return [{ source_title: "Search Failed", snippet: "Could not retrieve live search results.", url: "#" }];
        }
    };
    
    const getAgeGroupFromAI = async (userInput) => {
        if (userInput.toLowerCase().includes('7')) return 'Early Primary';
        const sorterPrompt = `Categorize the user's input into one of these: 'Early Primary', 'Primary', 'Middle School', 'High School', or 'University'. User input: '${userInput}'. Respond with ONLY the category name.`;
        const result = await callGeminiApi({ contents: [{ role: "user", parts: [{ text: sorterPrompt }] }] });
        const category = result.candidates?.[0]?.content.parts[0].text.trim();
        const validCategories = ['Early Primary', 'Primary', 'Middle School', 'High School', 'University'];
        return validCategories.includes(category) ? category : null;
    };

    const generateAiResponse = async (history, systemInstruction = '') => {
        setIsBotTyping(true);
        try {
            let historyToSend = [
                { role: 'user', parts: [{ text: basePrompt }] },
                { role: 'model', parts: [{ text: "Understood. I am the ALF Coach." }] },
                ...history
            ];
            if (systemInstruction) {
                 historyToSend.push({ role: "user", parts: [{ text: systemInstruction }] });
            }

            const tools = [{ "functionDeclarations": [
                { "name": "googleSearch_search", "description": "Search Google for information.", "parameters": { "type": "OBJECT", "properties": { "queries": { "type": "ARRAY", "items": { "type": "STRING" } } }, "required": ["queries"] } },
                { "name": "generateImage_generate", "description": "Generate concept art.", "parameters": { "type": "OBJECT", "properties": { "prompt": { "type": "STRING" } }, "required": ["prompt"] } }
            ]}];

            const initialResponse = await callGeminiApi({ contents: historyToSend, tools });
            let finalResponse = initialResponse;

            if (initialResponse.candidates?.[0]?.content?.parts[0]?.functionCall) {
                const functionCall = initialResponse.candidates[0].content.parts[0].functionCall;
                let toolResponseHistory = [...historyToSend, { role: 'model', parts: [{ functionCall }] }];
                let functionResponsePayload;

                if (functionCall.name === 'googleSearch_search') {
                    const searchResults = await performGoogleSearch(functionCall.args.queries);
                    functionResponsePayload = { name: 'googleSearch_search', response: { results: searchResults } };
                } else if (functionCall.name === 'generateImage_generate') {
                    const imageMessageId = Date.now() + '_image';
                    setMessages(prev => [...prev, { text: `*Generating concept art...*`, sender: 'bot', id: imageMessageId, isLoadingImage: true }]);
                    const imageUrl = await callImagenApi(functionCall.args.prompt);
                    setMessages(prev => prev.map(msg => msg.id === imageMessageId ? { ...msg, imageUrl, isLoadingImage: false, text: '' } : msg));
                    functionResponsePayload = { name: 'generateImage_generate', response: { status: "Image generated." } };
                }
                
                toolResponseHistory.push({ role: 'function', parts: [{ functionResponse: functionResponsePayload }] });
                finalResponse = await callGeminiApi({ contents: toolResponseHistory });
            }

            if (finalResponse.candidates?.[0]?.content) {
                let text = finalResponse.candidates[0].content.parts[0].text;
                
                const currentHistory = [...history, { role: "model", parts: [{ text }] }];
                setConversationHistory(currentHistory);
                
                const CURRICULUM_SIGNAL = "<<<CURRICULUM_COMPLETE>>>";
                const ASSIGNMENTS_SIGNAL = "<<<ASSIGNMENTS_COMPLETE>>>";
                const RUBRIC_SIGNAL = "<<<RUBRIC_COMPLETE>>>";

                if (text.includes(CURRICULUM_SIGNAL)) {
                    const curriculum = text.split(CURRICULUM_SIGNAL)[0];
                    setFinalCurriculumText(curriculum);
                    const curriculumMessage = { text: curriculum, sender: 'bot', id: Date.now() };
                    setMessages(prev => [...prev, curriculumMessage]);
                    
                    const followUpInstruction = `You have just presented the curriculum. Now, execute Step 4 of the Final Output workflow from your base prompt: Proactively offer to generate the assignments.`;
                    await generateAiResponse(currentHistory, followUpInstruction);
                    setConversationStage('awaiting_assignment_go_ahead');

                } else if (text.includes(ASSIGNMENTS_SIGNAL)) {
                    const assignmentsText = text.split(ASSIGNMENTS_SIGNAL)[0];
                    setFinalAssignmentsText(assignmentsText);
                    const fullProjectDoc = `${finalCurriculumText}\n\n---\n\n## Scaffolded Assignments\n\n${assignmentsText}`;
                    setFinalProjectDocument(fullProjectDoc);
                    
                    const assignmentsMessage = { text: assignmentsText, sender: 'bot', id: Date.now() };
                    setMessages(prev => [...prev, assignmentsMessage]);
                    setConversationStage('finished_assignments');
                
                } else if (text.includes(RUBRIC_SIGNAL)) {
                    const rubricText = text.split(RUBRIC_SIGNAL)[0];
                    const fullProjectDocWithRubric = `${finalProjectDocument}\n\n---\n\n## Assessment Rubric\n\n${rubricText}`;
                    setFinalProjectDocument(fullProjectDocWithRubric);
                    
                    const rubricMessage = { text: rubricText, sender: 'bot', id: Date.now() };
                    setMessages(prev => [...prev, rubricMessage]);
                    setConversationStage('finished_project');
                
                } else {
                    const botMessage = { text, sender: 'bot', id: Date.now() };
                    setMessages(prev => [...prev, botMessage]);
                }
            } else {
                throw new Error("Invalid AI response format.");
            }
        } catch (error) {
            console.error("AI response error:", error);
            setMessages(prev => [...prev, { text: `**An API error occurred:**\n\n\`\`\`\n${error.message}\n\`\`\``, sender: 'bot', id: Date.now() }]);
        } finally {
            setIsBotTyping(false);
        }
    };
    
    const handleSendMessage = async () => {
        if (!inputValue.trim() || isBotTyping) return;
        const userMessage = { text: inputValue, sender: 'user', id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputValue;
        setInputValue('');

        let updatedHistory = [...conversationHistory, { role: "user", parts: [{ text: currentInput }] }];
        
        let systemInstruction = '';
        let nextStage = conversationStage;
        
        const totalAssignments = ageGroup === 'High School' || ageGroup === 'University' ? 4 : 3;

        switch (conversationStage) {
            // ... (all previous stages remain the same) ...

            case 'awaiting_rubric_objectives':
                systemInstruction = `The user provided objectives. Now, execute Step 2 of the Rubric Design Workflow: Focus on the FIRST objective and elicit proficiency descriptors.\n\n${rubricGeneratorPrompt}`;
                nextStage = 'generating_rubric_row_1';
                break;
            
            case 'awaiting_critique_go_ahead':
                systemInstruction = `The user requested feedback. You are now the **Curriculum Doctor**. Analyze the complete project document and provide constructive feedback based on the V13 workflow.\n\n# Project Document\n${finalProjectDocument}\n\n${critiqueGeneratorPrompt}`;
                nextStage = 'finished_project'; // Stay on the final stage after critique
                break;

            case 'awaiting_example_finder_go_ahead': // V14 Case
                systemInstruction = `The user requested examples. You are now the **Dynamic PBL Example Finder**. Analyze the project document, formulate smart search queries, and call the googleSearch tool to find them. Then, synthesize the results as case studies.\n\n# Project Document\n${finalProjectDocument}\n\n${exampleFinderPrompt}`;
                nextStage = 'finished_project'; // Stay on the final stage after finding examples
                break;

            default:
                if (conversationStage.startsWith('generating_assignment_')) {
                    const currentAssignmentNum = parseInt(conversationStage.split('_')[2]);
                    systemInstruction = `The user gave input for assignment #${currentAssignmentNum}. Execute Step 3: Generate the detailed assignment text and ask for feedback.\n\n${assignmentGeneratorPrompt}`;
                    nextStage = `awaiting_assignment_${currentAssignmentNum}_feedback`;
                } else if (conversationStage.startsWith('awaiting_assignment_')) {
                    const finishedAssignmentNum = parseInt(conversationStage.split('_')[2]);
                    if (finishedAssignmentNum < totalAssignments) {
                        systemInstruction = `The user approved assignment #${finishedAssignmentNum}. Execute Step 4: Transition to the NEXT assignment.\n\n${assignmentGeneratorPrompt}`;
                        nextStage = `generating_assignment_${finishedAssignmentNum + 1}`;
                    } else {
                        systemInstruction = `The user approved the final assignment. Execute Step 5: Recommend assessment methods and signal completion.\n\n${assignmentGeneratorPrompt}`;
                        nextStage = 'finished_assignments';
                    }
                } else if (conversationStage.startsWith('generating_rubric_row_')) {
                    const currentRowNum = parseInt(conversationStage.split('_')[3]);
                    systemInstruction = `The user described the exemplary level for objective #${currentRowNum}. Execute Step 3 of the Rubric workflow: Propose language for the full spectrum of that objective.\n\n${rubricGeneratorPrompt}`;
                    nextStage = `awaiting_rubric_row_${currentRowNum}_feedback`;
                } else if (conversationStage.startsWith('awaiting_rubric_row_')) {
                    const finishedRowNum = parseInt(conversationStage.split('_')[3]);
                    // This logic needs to be expanded to check against the number of objectives the user provided.
                    systemInstruction = `The user approved the criteria for objective #${finishedRowNum}. Now, execute Step 5 of the Rubric workflow: Generate the final rubric and signal completion.\n\n${rubricGeneratorPrompt}`;
                    nextStage = 'finished_project';
                }
                else {
                    systemInstruction = `Continue the conversation based on the current stage: ${conversationStage}. Use this context: # PEDAGOGICAL CONTEXT\n${ageGroupPrompt}`;
                    if(conversationStage === 'design_method') {
                        systemInstruction += `\n\n# AVAILABLE TOOLS\n${imageGeneratorPrompt}`;
                    }
                }
                break;
        }
        
        setConversationStage(nextStage);
        await generateAiResponse(updatedHistory, systemInstruction);
    };

    const startRubricGeneration = () => {
        setConversationStage('awaiting_rubric_go_ahead');
        const userMessage = { text: "Yes, let's build the rubric.", sender: 'user', id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        const updatedHistory = [...conversationHistory, { role: "user", parts: [{ text: userMessage.text }] }];
        
        const systemInstruction = `The user agreed to design a rubric. You are now the **Expert Assessment Coach**. Your context is the curriculum and assignments we built:\n\n${finalProjectDocument}\n\nExecute Step 1 of the V12.2 Rubric Design Workflow: Elicit core learning objectives.\n\n${rubricGeneratorPrompt}`;
        generateAiResponse(updatedHistory, systemInstruction);
        setConversationStage('awaiting_rubric_objectives');
    };

    const startCritique = () => {
        setConversationStage('awaiting_critique_go_ahead');
        const userMessage = { text: "Yes, please give me feedback.", sender: 'user', id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        const updatedHistory = [...conversationHistory, { role: "user", parts: [{ text: userMessage.text }] }];

        const systemInstruction = `The user requested feedback. You are now the **Curriculum Doctor**. Analyze the complete project document and provide constructive feedback based on the V13 workflow.\n\n# Project Document\n${finalProjectDocument}\n\n${critiqueGeneratorPrompt}`;
        generateAiResponse(updatedHistory, systemInstruction);
    };

    const startExampleFinder = () => {
        setConversationStage('awaiting_example_finder_go_ahead');
        const userMessage = { text: "Yes, please find some examples.", sender: 'user', id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        const updatedHistory = [...conversationHistory, { role: "user", parts: [{ text: userMessage.text }] }];

        const systemInstruction = `The user requested examples. You are now the **Dynamic PBL Example Finder**. Analyze the project document, formulate smart search queries, and call the googleSearch tool to find them. Then, synthesize the results as case studies.\n\n# Project Document\n${finalProjectDocument}\n\n${exampleFinderPrompt}`;
        generateAiResponse(updatedHistory, systemInstruction);
    };

    // --- RENDER LOGIC ---
    if (!isAuthReady) { return <div style={styles.centeredContainer}><h1>Loading ALF Coach...</h1></div>; }
    return (
        <div style={styles.appContainer}>
            <header style={styles.header}>
                <div style={styles.headerTitleContainer}>
                    <h1 style={styles.headerTitle}>ALF: The Active Learning Framework Coach</h1>
                    <p style={styles.headerSlogan}>Your Partner in Creative Curriculum</p>
                </div>
                {user && (<div style={styles.headerActions}><button onClick={handleStartNewProject} style={styles.newProjectButton}>+ New Curriculum</button><button onClick={handleSignOut} style={styles.authButton}>Sign Out</button></div>)}
            </header>
            <main style={styles.mainContent}>
                <div style={styles.contentWrapper}>
                    {!user ? (
                        <div style={styles.centeredContainer}>
                            <h2>Welcome to your persistent workspace.</h2>
                            <p style={{margin: '16px 0 24px'}}>Sign in to save your projects and continue your work anytime.</p>
                            <button onClick={handleSignIn} style={styles.button}>Sign In Anonymously</button>
                        </div>
                    ) : !currentProjectId ? (
                        <div style={styles.dashboardContainer}>
                            <h2>Your Projects</h2>
                            <p>Select a project to continue, or start a new one.</p>
                            <ul style={styles.projectList}>
                                {projects.map(p => (<li key={p.id} style={styles.projectItem} onClick={() => loadProject(p.id)}><strong>{p.title || 'Untitled Project'}</strong><br/><small>Last updated: {p.lastUpdated ? new Date(p.lastUpdated.seconds * 1000).toLocaleString() : 'N/A'}</small></li>))}
                            </ul>
                            <button onClick={handleStartNewProject} style={styles.button}>+ Start New Project</button>
                        </div>
                    ) : (
                        <>
                            {['finished_assignments', 'finished_project'].includes(conversationStage) ? (
                                <FinalSummaryDisplay 
                                    finalDocument={finalProjectDocument} 
                                    onRestart={() => setCurrentProjectId(null)} 
                                    onGenerateRubric={startRubricGeneration}
                                    onGetFeedback={startCritique}
                                    onFindExamples={startExampleFinder}
                                    stage={conversationStage}
                                />
                            ) : (
                                <>
                                    {messages.map((msg) => (<ChatMessage key={msg.id} message={msg} />))}
                                    {isBotTyping && <div style={styles.messageContainer(true)}><div style={styles.iconContainer}><BotIcon /></div><div style={styles.messageBubble(true)}>...</div></div>}
                                    <div ref={chatEndRef} />
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
            {user && currentProjectId && !['finished_assignments', 'finished_project'].includes(conversationStage) && (
                <footer style={styles.footer}>
                    <div style={styles.inputArea}>
                        <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="Type your response here..." style={styles.textarea} disabled={isBotTyping} />
                        <button onClick={handleSendMessage} disabled={!inputValue.trim() || isBotTyping} style={{...styles.sendButton, ...(isBotTyping || !inputValue.trim() ? styles.sendButtonDisabled : {})}}><SendIcon /></button>
                    </div>
                </footer>
            )}
        </div>
    );
}
