import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

// --- V10: FIREBASE & PROMPT IMPORTS (No change) ---
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { collection, addDoc, doc, getDocs, getDoc, setDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { basePrompt } from './prompts/base_prompt.js';
import { intakePrompt } from './prompts/intake_prompt.js';
import { intakeSafetyCheckPrompt } from './prompts/intake_safety_check_prompt.js';
import { safetyCheckPrompt } from './prompts/safety_check_prompt.js';
import { assignmentGeneratorPrompt } from './prompts/assignment_generator_prompt.js';
import { earlyPrimaryPrompt } from './prompts/early_primary_prompt.js';
import { primaryPrompt } from './prompts/primary_prompt.js';
import { middleSchoolPrompt } from './prompts/middle_school_prompt.js';
import { highSchoolPrompt } from './prompts/high_school_prompt.js';
import { universityPrompt } from './prompts/university_prompt.js';

// --- STYLING & ICONS (V10.5 Update) ---
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
  contentWrapper: { width: '100%', maxWidth: '1024px', margin: '0 auto', padding: '0 24px 24px 24px' },
  footer: { backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: '16px', flexShrink: 0 },
  inputArea: { maxWidth: '1024px', margin: '0 auto', display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '8px' },
  textarea: { width: '100%', backgroundColor: 'transparent', padding: '8px', color: '#1f2937', border: 'none', outline: 'none', resize: 'none', fontSize: '1rem' },
  sendButton: { padding: '12px', borderRadius: '50%', backgroundColor: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' },
  sendButtonDisabled: { backgroundColor: '#9ca3af', cursor: 'not-allowed' },
  messageContainer: (isBot) => ({ display: 'flex', alignItems: 'flex-start', gap: '12px', margin: '16px 0', justifyContent: isBot ? 'flex-start' : 'flex-end' }),
  iconContainer: { flexShrink: 0, backgroundColor: '#e5e7eb', borderRadius: '50%', padding: '8px' },
  messageBubble: (isBot) => ({ maxWidth: '80%', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: isBot ? '#eef2ff' : 'white', color: '#1f2937', wordWrap: 'break-word', borderTopLeftRadius: isBot ? '0px' : '12px', borderTopRightRadius: isBot ? '12px' : '0px', lineHeight: 1.7 }),
  centeredContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center' },
  dashboardContainer: { backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '1024px' },
  projectList: { listStyle: 'none', padding: 0, margin: '24px 0' },
  projectItem: { textAlign: 'left', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px', cursor: 'pointer' },
  button: { backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' },
  summaryContainer: { backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  summaryActions: { marginTop: '24px', display: 'flex', gap: '12px' },
  actionButton: { flex: 1, backgroundColor: '#6b7280', color: 'white', fontWeight: 'bold', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' },
  searchResultCard: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white', marginTop: '12px' },
  searchResultTitle: { fontWeight: 'bold', color: '#4f46e5', textDecoration: 'none' },
  searchResultSnippet: { fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' },
};
const BotIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#4f46e5'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#6b7280'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '24px', width: '24px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);

const renderMarkdown = (text) => {
    if (typeof text !== 'string') return { __html: '' };
    const rawMarkup = marked(text, { breaks: true, gfm: true });
    return { __html: rawMarkup };
};

const SearchResultCard = ({ result }) => (
    <div style={styles.searchResultCard}>
        <a href={result.url} target="_blank" rel="noopener noreferrer" style={styles.searchResultTitle}>
            {result.source_title}
        </a>
        <p style={styles.searchResultSnippet}>{result.snippet}</p>
    </div>
);

const ChatMessage = ({ message }) => {
    const { text, sender, searchResults } = message;
    const isBot = sender === 'bot';
    return (
        <div style={styles.messageContainer(isBot)}>
            {isBot && <div style={styles.iconContainer}><BotIcon /></div>}
            <div style={{...styles.messageBubble(isBot), paddingBottom: searchResults ? '8px' : '16px' }}>
                <div dangerouslySetInnerHTML={renderMarkdown(text)} />
                {searchResults && (
                    <div>
                        {searchResults.map((result, index) => (
                            <SearchResultCard key={index} result={result} />
                        ))}
                    </div>
                )}
            </div>
            {!isBot && <div style={styles.iconContainer}><UserIcon /></div>}
        </div>
    );
};

const FinalProjectDisplay = ({ finalDocument, onRestart }) => {
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
                <button onClick={handleCopy} style={styles.actionButton}>{copySuccess || 'Copy to Clipboard'}</button>
                <button onClick={onRestart} style={styles.actionButton}>Back to Dashboard</button>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT (V10.5) ---
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
    const [intakeAnswers, setIntakeAnswers] = useState({});
    const [finalCurriculumText, setFinalCurriculumText] = useState('');
    const [generatedAssignments, setGeneratedAssignments] = useState([]);
    const [finalProjectDocument, setFinalProjectDocument] = useState('');
    const [sessionSummary, setSessionSummary] = useState('');
    const inputRef = useRef(null);
    const chatEndRef = useRef(null);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // --- EFFECTS ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) { setUser(user); fetchProjects(user.uid); } 
            else { setUser(null); setProjects([]); setCurrentProjectId(null); }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const save = async () => { if (currentProjectId && user && conversationHistory.length > 2) { await saveConversation(); } };
        save();
    }, [conversationHistory]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (inputRef.current) { inputRef.current.focus(); }
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
        const welcomeMessage = { text: "Welcome! I'm the ALF Coach, your creative partner in designing transformative learning experiences. To start, please tell me what age or grade level you are designing for (e.g., '7 year olds', 'high school', or 'university').", sender: 'bot', id: Date.now() };
        const initialHistory = [{ role: 'user', parts: [{ text: basePrompt }] }, { role: 'model', parts: [{ text: "Understood. I am the ALF Coach. I will now greet the user." }] }];
        setMessages([welcomeMessage]); setConversationHistory(initialHistory); setConversationStage('select_age');
        setCurrentProjectId(`temp_${Date.now()}`); setFinalCurriculumText(''); setGeneratedAssignments([]); setFinalProjectDocument(''); setSessionSummary('');
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
                .filter(turn => !(turn.role === 'model' && turn.parts[0].text.includes('Understood. I am the ALF Coach.')))
                .map((turn, index) => ({
                    text: turn.parts[0].text, sender: turn.role === 'user' ? 'user' : 'bot', id: `${projectId}_${index}`
                }));
            setMessages(loadedMessages);
            setConversationStage(projectData.stage || 'follow_up');
            setAgeGroup(projectData.ageGroup || '');
            setAgeGroupPrompt(projectData.ageGroupPrompt || '');
            setCurrentProjectId(projectId);
        }
    };
    const saveConversation = async () => {
        if (!user || !currentProjectId) return;
        const projectData = { 
            history: conversationHistory, 
            lastUpdated: serverTimestamp(), 
            title: conversationHistory[2]?.parts[0]?.text.substring(0, 50) || 'New Project', 
            stage: conversationStage,
            ageGroup: ageGroup,
            ageGroupPrompt: ageGroupPrompt 
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
    const callApi = async (payload) => {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API call failed with status: ${response.status}. Response: ${errorBody}`);
        }
        return await response.json();
    };
    
    const getAgeGroupFromAI = async (userInput) => {
        const sorterPrompt = `You are an input sorter. Your job is to categorize the user's input into one of five specific categories: 'Early Primary', 'Primary', 'Middle School', 'High School', or 'University'. The user's input is: '${userInput}'. Respond with ONLY the category name and nothing else.`;
        const result = await callApi({ contents: [{ role: "user", parts: [{ text: sorterPrompt }] }] });
        if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts[0].text) {
            const category = result.candidates[0].content.parts[0].text.trim();
            const validCategories = ['Early Primary', 'Primary', 'Middle School', 'High School', 'University'];
            if (validCategories.includes(category)) {
                return category;
            }
        }
        return null;
    };
    
    const runIntakeSafetyCheck = async (userInput) => { /* Unchanged */ };
    const runMainSafetyCheck = async (catalystText) => { /* Unchanged */ };
    const summarizeKeyDecisions = async (historyForSummary) => { /* Unchanged */ };

    const generateAiResponse = async (history, systemInstruction = '') => {
        setIsBotTyping(true);
        try {
            let historyToSend = [...history];
            if (systemInstruction) {
                 historyToSend.push({ role: "user", parts: [{ text: systemInstruction }] });
            }

            const tools = [{
                "functionDeclarations": [{
                    "name": "googleSearch_search",
                    "description": "Returns a list of search results from Google Search for a given query.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": { "queries": { "type": "ARRAY", "items": { "type": "STRING" } } },
                        "required": ["queries"]
                    }
                }]
            }];

            const initialResponse = await callApi({ contents: historyToSend, tools: tools });
            const initialCandidate = initialResponse.candidates?.[0];
            
            let finalResponse;
            let searchResultsForMessage = null;

            if (initialCandidate?.content?.parts[0]?.functionCall) {
                const functionCall = initialCandidate.content.parts[0].functionCall;
                if (functionCall.name === 'googleSearch_search') {
                    const searchQueries = functionCall.args.queries;
                    const searchMessage = { text: `*Searching for: "${searchQueries.join(", ")}"*`, sender: 'bot', id: Date.now() + '_search' };
                    setMessages(prev => [...prev, searchMessage]);

                    searchResultsForMessage = [{
                        url: "https://example.com",
                        source_title: "Simulated Search Result",
                        snippet: "This is a placeholder. In a real app, this would be live data."
                    }];

                    const toolResponseHistory = [
                        ...historyToSend,
                        { role: 'model', parts: [{ functionCall }] },
                        {
                            role: 'function',
                            parts: [{
                                functionResponse: {
                                    name: 'googleSearch_search',
                                    response: { results: searchResultsForMessage }
                                }
                            }]
                        }
                    ];
                    
                    finalResponse = await callApi({ contents: toolResponseHistory });
                    setConversationHistory(toolResponseHistory);
                }
            } else {
                finalResponse = initialResponse;
            }

            if (finalResponse.candidates && finalResponse.candidates[0].content) {
                let text = finalResponse.candidates[0].content.parts[0].text;
                setConversationHistory(prev => [...prev, { role: "model", parts: [{ text }] }]);
                
                const CATALYST_SIGNAL = "<<<CATALYST_DEFINED>>>";
                const COMPLETION_SIGNAL = "<<<CURRICULUM_COMPLETE>>>";
                const ASSIGNMENTS_COMPLETE_SIGNAL = "<<<ASSIGNMENTS_COMPLETE>>>";

                if (text.includes(CATALYST_SIGNAL)) {
                    const summary = text.replace(CATALYST_SIGNAL, "").trim();
                    const safetyResult = await runMainSafetyCheck(summary);
                    if (safetyResult === "PROCEED") {
                        const transitionMessage = text.replace(CATALYST_SIGNAL, "").trim();
                        setMessages(prev => [...prev, { text: transitionMessage, sender: 'bot', id: Date.now() }]);
                        setConversationStage('issues_planning');
                    } else {
                        setMessages(prev => [...prev, { text: safetyResult, sender: 'bot', id: Date.now() }]);
                        setConversationStage('catalyst_planning');
                    }
                } else if (text.includes(COMPLETION_SIGNAL)) {
                    const curriculumText = text.replace(COMPLETION_SIGNAL, "").trim();
                    setFinalCurriculumText(curriculumText);
                    await summarizeKeyDecisions(conversationHistory); 
                    const curriculumMessage = { text: curriculumText, sender: 'bot', id: Date.now() };
                    const assignmentOffer = { text: "We now have a strong foundation for our curriculum. Shall we now proceed to build out the detailed, scaffolded assignments for the students?", sender: 'bot', id: Date.now() + 1 };
                    setMessages(prev => [...prev, curriculumMessage, assignmentOffer]);
                    setConversationStage('awaiting_assignments_confirmation');
                } else if (text.includes(ASSIGNMENTS_COMPLETE_SIGNAL)) {
                    const lastAssignmentText = text.replace(ASSIGNMENTS_COMPLETE_SIGNAL, "").trim();
                    const allAssignments = [...generatedAssignments, lastAssignmentText].join('\n\n');
                    const fullDocument = `${finalCurriculumText}\n\n---\n\n## Scaffolded Assignments\n\n${allAssignments}`;
                    setFinalProjectDocument(fullDocument);
                    setConversationStage('finished_project');
                }
                else {
                    if (conversationStage === 'designing_assignments_main') {
                        setGeneratedAssignments(prev => [...prev, text]);
                    }
                    const botMessage = { text, sender: 'bot', id: Date.now(), searchResults: searchResultsForMessage };
                    setMessages(prev => [...prev, botMessage]);
                }
            } else {
                const errorText = JSON.stringify(finalResponse, null, 2);
                setMessages(prev => [...prev, { text: `Sorry, the AI response was invalid. Details: ${errorText}`, sender: 'bot', id: Date.now() }]);
            }
        } catch (error) {
            console.error("AI response error:", error);
            setMessages(prev => [...prev, { text: `**An API error occurred:**\n\n\`\`\`\n${error.message}\n\`\`\``, sender: 'bot', id: Date.now() }]);
        } finally {
            setIsBotTyping(false);
        }
    };
    
    // --- V10.5: CONVERSATIONAL ENGINE UPDATE ---
    const handleSendMessage = async () => {
        if (!inputValue.trim() || isBotTyping) return;
        const userMessage = { text: inputValue, sender: 'user', id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputValue;
        setInputValue('');

        let updatedHistory = [...conversationHistory, { role: "user", parts: [{ text: currentInput }] }];
        setConversationHistory(updatedHistory);
        
        try {
            let systemInstruction = '';
            const contextInstruction = `# CONTEXT\nYou are coaching a teacher for the following age group: **${ageGroup}**. You MUST use the pedagogical directives outlined in this specialized prompt:\n\n${ageGroupPrompt}`;

            switch (conversationStage) {
                case 'select_age': {
                    setIsBotTyping(true);
                    const category = await getAgeGroupFromAI(currentInput);
                    if (category) {
                        let selectedPrompt = '';
                        if (category === 'Early Primary') selectedPrompt = earlyPrimaryPrompt;
                        else if (category === 'Primary') selectedPrompt = primaryPrompt;
                        else if (category === 'Middle School') selectedPrompt = middleSchoolPrompt;
                        else if (category === 'High School') selectedPrompt = highSchoolPrompt;
                        else if (category === 'University') selectedPrompt = universityPrompt;
                        
                        setAgeGroup(category);
                        setAgeGroupPrompt(selectedPrompt);
                        
                        // V10.5 FIX: Make the initial prompt acknowledge the user's input.
                        systemInstruction = `The user has selected **${category}** as their age group. Acknowledge this choice in a friendly and encouraging way (e.g., "Great, designing for [age group]..."), then immediately ask Intake Question 1 from the intake prompt below.\n\n${intakePrompt}`;
                        await generateAiResponse(updatedHistory, systemInstruction);
                        setConversationStage('awaiting_intake_1');
                    } else {
                        setMessages(prev => [...prev, { text: "I'm sorry, I couldn't determine the age group. Could you please try again?", sender: 'bot', id: Date.now() + 1 }]);
                        setIsBotTyping(false);
                    }
                    break;
                }
                case 'awaiting_intake_1': {
                    setIntakeAnswers({ experience: currentInput });
                    systemInstruction = `${intakePrompt}\nThe user has responded to Question 1. Their experience level is: '${currentInput}'. Now, follow your protocol to provide the correct pedagogical onboarding (Path A or B) and ask Question 2.`;
                    await generateAiResponse(updatedHistory, systemInstruction);
                    setConversationStage('awaiting_intake_2');
                    break;
                }
                case 'awaiting_intake_2': {
                    const lowerCaseInput = currentInput.toLowerCase();
                    const needsIdeas = ['no', 'not yet', 'don\'t know', 'need help', 'need ideas', 'explore'].some(term => lowerCaseInput.includes(term));

                    if (needsIdeas) {
                        setIntakeAnswers(prev => ({ ...prev, idea: 'User needs help brainstorming' }));
                        systemInstruction = `${intakePrompt}\nThe user has indicated they need help brainstorming a topic. Follow Path C.`;
                        await generateAiResponse(updatedHistory, systemInstruction);
                        setConversationStage('awaiting_intake_2');
                        return;
                    }

                    const sentiment = await runIntakeSafetyCheck(currentInput);
                    if (sentiment === 'UNSAFE') {
                        setMessages(prev => [...prev, { text: "I cannot proceed with that topic as it violates safety guidelines. Please choose a different theme.", sender: 'bot', id: Date.now() + 1 }]);
                        setConversationStage('awaiting_intake_2');
                        setIsBotTyping(false);
                        return;
                    }
                    
                    setIntakeAnswers(prev => ({ ...prev, idea: currentInput }));
                    
                    let intakeSystemInstruction = intakePrompt;
                    if (sentiment === 'QUESTIONABLE') {
                        intakeSystemInstruction = `# SPECIAL INSTRUCTION: The user has proposed a sensitive topic. Adopt a neutral, probing tone as you ask the next question. Do not use positive affirmations.\n\n${intakePrompt}`;
                    }
                    
                    systemInstruction = `${intakeSystemInstruction}\nThe user has responded to Question 2 with a topic. Their idea is: '${currentInput}'. Follow your protocol and ask Question 3.`;
                    await generateAiResponse(updatedHistory, systemInstruction);
                    setConversationStage('awaiting_intake_3');
                    break;
                }
                case 'awaiting_intake_3': {
                    const finalIntakeAnswers = { ...intakeAnswers, constraints: currentInput };
                    systemInstruction = `${contextInstruction}\n\n# USER CONTEXT FROM INTAKE:\n- User's experience with PBL: ${finalIntakeAnswers.experience}\n- User's starting idea: ${finalIntakeAnswers.idea}\n- User's project constraints: ${finalIntakeAnswers.constraints}\n\nNow, begin the curriculum design process. Start with the Catalyst stage.`;
                    const kickoffMessage = { text: "Excellent, this is all incredibly helpful context. Let's get started.", sender: 'bot', id: Date.now() + 1 };
                    setMessages(prev => [...prev, kickoffMessage]);
                    updatedHistory.push({ role: "model", parts: [{ text: kickoffMessage.text }] });
                    setConversationHistory(updatedHistory);
                    await generateAiResponse(updatedHistory, systemInstruction);
                    setConversationStage('catalyst_planning');
                    break;
                }
                case 'awaiting_title': {
                    systemInstruction = `${contextInstruction}\n\nThe user has chosen the title: "${currentInput}". Now, generate the complete, final curriculum document based on our entire conversation.`;
                    await generateAiResponse(updatedHistory, systemInstruction);
                    break;
                }
                case 'catalyst_planning':
                case 'issues_planning':
                case 'method_planning': {
                     await generateAiResponse(updatedHistory, contextInstruction);
                     break;
                }
                case 'engagement_planning': {
                    await generateAiResponse(updatedHistory, contextInstruction);
                    setConversationStage('awaiting_title');
                    break;
                }
                case 'awaiting_assignments_confirmation': {
                    if (currentInput.toLowerCase().includes('yes')) {
                        setConversationStage('designing_assignments_intro');
                        systemInstruction = `${contextInstruction}\n\n${assignmentGeneratorPrompt}\n\nHere is the curriculum we designed:\n\n${finalCurriculumText}\n\nNow, begin the assignment design workflow. Start with Step 1: Propose the Scaffolding Strategy for the ${ageGroup} age group.`;
                        await generateAiResponse(updatedHistory, systemInstruction);
                    } else {
                        setMessages(prev => [...prev, { text: "No problem! Feel free to ask any other follow-up questions.", sender: 'bot', id: Date.now() + 1 }]);
                        setConversationStage('follow_up');
                        setIsBotTyping(false);
                    }
                    break;
                }
                case 'designing_assignments_intro':
                case 'designing_assignments_main': {
                    setConversationStage('designing_assignments_main');
                    await generateAiResponse(updatedHistory, contextInstruction);
                    break;
                }
                default: {
                    await generateAiResponse(updatedHistory, contextInstruction);
                }
            }
        } catch (error) {
            console.error("Error in handleSendMessage:", error);
            setMessages(prev => [...prev, { text: `**An application error occurred:**\n\n\`\`\`\n${error.message}\n\`\`\``, sender: 'bot', id: Date.now() }]);
            setIsBotTyping(false);
        }
    };


    // --- RENDER LOGIC (V10.5 Update) ---
    if (!isAuthReady) { return <div style={styles.centeredContainer}><h1>Loading ALF Coach...</h1></div>; }
    return (
        <div style={styles.appContainer}>
            <header style={styles.header}>
                <div style={styles.headerTitleContainer}>
                    <h1 style={styles.headerTitle}>ALF: The Active Learning Framework Coach</h1>
                    <p style={styles.headerSlogan}>Your Partner in Creative Curriculum</p>
                </div>
                {user && (
                    <div style={styles.headerActions}>
                        <button onClick={handleStartNewProject} style={styles.newProjectButton}>+ New Curriculum</button>
                        <button onClick={handleSignOut} style={styles.authButton}>Sign Out</button>
                    </div>
                )}
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
                                {projects.map(p => (
                                    <li key={p.id} style={styles.projectItem} onClick={() => loadProject(p.id)}>
                                        <strong>{p.title || 'Untitled Project'}</strong><br/>
                                        <small>Last updated: {p.lastUpdated ? new Date(p.lastUpdated.seconds * 1000).toLocaleString() : 'N/A'}</small>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={handleStartNewProject} style={styles.button}>+ Start New Project</button>
                        </div>
                    ) : (
                        <>
                            {conversationStage === 'finished_project' ? (
                                <FinalProjectDisplay finalDocument={finalProjectDocument} onRestart={() => setCurrentProjectId(null)} />
                            ) : (
                                <>
                                    {messages.map((msg) => (<ChatMessage key={msg.id} message={msg} />))}
                                    {isBotTyping && ( <div style={styles.messageContainer(true)}><div style={styles.iconContainer}><BotIcon /></div><div style={styles.messageBubble(true)}>...</div></div> )}
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
                        <button onClick={handleSendMessage} disabled={!inputValue.trim() || isBotTyping} style={{...styles.sendButton, ...(isBotTyping || !inputValue.trim() ? styles.sendButtonDisabled : {})}}>
                            <SendIcon />
                        </button>
                    </div>
                </footer>
            )}
        </div>
    );
}
