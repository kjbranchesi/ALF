import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

// --- V12.1: FIREBASE & REBUILT PROMPT IMPORTS ---
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { collection, addDoc, doc, getDocs, getDoc, setDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { basePrompt } from './prompts/base_prompt.js';
import { intakePrompt } from './prompts/intake_prompt.js';
import { safetyCheckPrompt } from './prompts/safety_check_prompt.js';
import { assignmentGeneratorPrompt } from './prompts/assignment_generator_prompt.js';
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
  summaryActions: { marginTop: '24px', display: 'flex', gap: '12px' },
  actionButton: { flex: 1, backgroundColor: '#6b7280', color: 'white', fontWeight: 'bold', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' },
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

const FinalSummaryDisplay = ({ finalDocument, onRestart }) => {
    const [copySuccess, setCopySuccess] = useState('');
    const handleCopy = () => {
        const textarea = document.createElement('textarea');
        textarea.value = finalDocument;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        } catch (err) {
            setCopySuccess('Failed to copy');
        }
        document.body.removeChild(textarea);
    };
    return (
        <div style={styles.summaryContainer}>
            <div dangerouslySetInnerHTML={renderMarkdown(finalDocument)} />
            <div style={styles.summaryActions}>
                <button onClick={handleCopy} style={{...styles.actionButton, backgroundColor: '#4f46e5' }}>{copySuccess || 'Copy to Clipboard'}</button>
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
    const [finalProjectDocument, setFinalProjectDocument] = useState('');
    const [assignmentCount, setAssignmentCount] = useState(0);
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
        setFinalProjectDocument('');
        setAgeGroup('');
        setAgeGroupPrompt('');
        setAssignmentCount(0);
    };

    const loadProject = async (projectId) => {
        if (!user) return;
        const projectDocRef = doc(db, 'users', user.uid, 'projects', projectId);
        const projectSnap = await getDoc(projectDocRef);
        if (projectSnap.exists()) {
            const projectData = projectSnap.data();
            const loadedHistory = projectData.history || [];
            setConversationHistory(loadedHistory);
            const loadedMessages = loadedHistory
                .filter(turn => !(turn.role === 'user' && turn.parts[0].text.includes('# META-INSTRUCTION')))
                .map((turn, index) => ({
                    text: turn.parts[0].text, sender: turn.role === 'user' ? 'user' : 'bot', id: `${projectId}_${index}`
                }));
            setMessages(loadedMessages);
            setConversationStage(projectData.stage || 'welcome');
            setAgeGroup(projectData.ageGroup || '');
            setAgeGroupPrompt(projectData.ageGroupPrompt || '');
            setFinalCurriculumText(projectData.finalCurriculumText || '');
            setFinalProjectDocument(projectData.finalProjectDocument || '');
            setAssignmentCount(projectData.assignmentCount || 0);
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
            finalProjectDocument,
            assignmentCount
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
        // V12.1 FIX: Correctly map "7 year olds" to Early Primary
        if (userInput.toLowerCase().includes('7')) return 'Early Primary';

        const sorterPrompt = `You are an input sorter. Categorize the user's input into one of these: 'Early Primary', 'Primary', 'Middle School', 'High School', or 'University'. User input: '${userInput}'. Respond with ONLY the category name.`;
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
                
                const COMPLETION_SIGNAL = "<<<CURRICULUM_COMPLETE>>>";
                const ASSIGNMENTS_COMPLETE_SIGNAL = "<<<ASSIGNMENTS_COMPLETE>>>";

                if (text.includes(COMPLETION_SIGNAL)) {
                    const curriculum = text.split(COMPLETION_SIGNAL)[0];
                    setFinalCurriculumText(curriculum);
                    const curriculumMessage = { text: curriculum, sender: 'bot', id: Date.now() };
                    setMessages(prev => [...prev, curriculumMessage]);
                    
                    const followUpInstruction = `You have just presented the curriculum. Now, execute Step 4 of the Final Output workflow from your base prompt: Proactively offer to generate the assignments.`;
                    await generateAiResponse(currentHistory, followUpInstruction);
                    setConversationStage('awaiting_assignment_go_ahead');

                } else if (text.includes(ASSIGNMENTS_COMPLETE_SIGNAL)) {
                    const assignmentsText = text.split(ASSIGNMENTS_COMPLETE_SIGNAL)[0];
                    const fullProjectDoc = `${finalCurriculumText}\n\n---\n\n## Scaffolded Assignments\n\n${assignmentsText}`;
                    setFinalProjectDocument(fullProjectDoc);
                    
                    const assignmentsMessage = { text: assignmentsText, sender: 'bot', id: Date.now() };
                    setMessages(prev => [...prev, assignmentsMessage]);
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
        setConversationHistory(updatedHistory);
        
        let systemInstruction = '';
        let nextStage = conversationStage;
        
        const totalAssignments = ageGroup === 'High School' || ageGroup === 'University' ? 4 : 3;

        switch (conversationStage) {
            case 'select_age':
                const category = await getAgeGroupFromAI(currentInput);
                if (category) {
                    const prompts = { 'Early Primary': earlyPrimaryPrompt, 'Primary': primaryPrompt, 'Middle School': middleSchoolPrompt, 'High School': highSchoolPrompt, 'University': universityPrompt };
                    setAgeGroup(category);
                    setAgeGroupPrompt(prompts[category]);
                    systemInstruction = `The user chose **${category}**. Acknowledge this, then execute Step 1 of the Intake Workflow.\n\n${intakePrompt}`;
                    nextStage = 'intake_awaiting_experience';
                } else {
                    systemInstruction = "Politely ask the user to clarify the age group from the provided categories.";
                }
                break;
            
            case 'intake_awaiting_experience':
                systemInstruction = `The user described their experience. Now, execute Step 2 of the Intake Workflow (Acknowledge, Explain, Ask for Topic).\n\n${intakePrompt}`;
                nextStage = 'intake_awaiting_topic';
                break;

            case 'intake_awaiting_topic':
                const safetyResult = await callGeminiApi({ contents: [{ role: 'user', parts: [{ text: `${safetyCheckPrompt}\n\nCatalyst: "${currentInput}"` }] }] });
                if (safetyResult.candidates?.[0]?.content.parts[0].text.includes('PROCEED')) {
                    systemInstruction = `The user provided a topic. Now, execute Step 4 of the Intake Workflow (Ask about constraints).\n\n${intakePrompt}`;
                    nextStage = 'intake_awaiting_constraints';
                } else {
                    systemInstruction = `The topic was flagged as unsafe. Respond with the exact phrase: "I cannot proceed with that topic as it violates safety guidelines. Let's rethink our Catalyst. What is another challenge we could explore?"`;
                    nextStage = 'intake_awaiting_topic';
                }
                break;

            case 'intake_awaiting_constraints':
                systemInstruction = `The user provided constraints. Now, begin the curriculum design by introducing Stage 1: The Catalyst, using the exact phrasing from the base prompt.`;
                nextStage = 'design_catalyst';
                break;
            
            case 'awaiting_assignment_go_ahead':
                systemInstruction = `The user agreed to design assignments. You are now the **Expert Pedagogical Coach**. Your context is the curriculum we just built:\n\n${finalCurriculumText}\n\nExecute Step 1 of the V12.1 Assignment Design Workflow: Propose the correct, ADAPTED scaffolding strategy for **${ageGroup}**.\n\n${assignmentGeneratorPrompt}`;
                nextStage = 'awaiting_assignment_strategy_approval';
                break;

            case 'awaiting_assignment_strategy_approval':
                 systemInstruction = `The user approved the strategy. Execute Step 2 of the workflow: Elicit the teacher's input for the FIRST adapted assignment.\n\n${assignmentGeneratorPrompt}`;
                 nextStage = `generating_assignment_1`;
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
                        nextStage = 'finished_project'; // Temp stage before final display
                    }
                } else {
                    systemInstruction = `Continue the conversation based on the current stage: ${conversationStage}. Use this context: # PEDAGOGICAL CONTEXT\n${ageGroupPrompt}`;
                    if (conversationStage === 'design_method') {
                        systemInstruction += `\n\n# AVAILABLE TOOLS\n${imageGeneratorPrompt}`;
                    }
                }
                break;
        }
        
        setConversationStage(nextStage);
        await generateAiResponse(updatedHistory, systemInstruction);
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
                            {conversationStage === 'finished_project' ? (
                                <FinalSummaryDisplay finalDocument={finalProjectDocument} onRestart={() => setCurrentProjectId(null)} />
                            ) : (
                                <>
                                    {messages.map((msg) => (<ChatMessage key={msg.id} message={msg} />))}
                                    {isBotTyping && !messages.some(m => m.isLoadingImage) && ( <div style={styles.messageContainer(true)}><div style={styles.iconContainer}><BotIcon /></div><div style={styles.messageBubble(true)}>...</div></div> )}
                                    <div ref={chatEndRef} />
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
            {user && currentProjectId && conversationStage !== 'finished_project' && (
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
