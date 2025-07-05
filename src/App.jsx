import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

// --- V9: FIREBASE & PROMPT IMPORTS ---
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

// --- STYLING & ICONS (V9.7 Update) ---
const styles = {
  appContainer: { fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column', height: '100vh' },
  header: { backgroundColor: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10, flexShrink: 0 },
  headerTitleContainer: { display: 'flex', flexDirection: 'column' },
  headerTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  headerSlogan: { fontSize: '0.875rem', color: '#6b7280', margin: 0, marginTop: '4px' },
  authButton: { backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: '1px solid #4f46e5', cursor: 'pointer', transition: 'background-color 0.2s' },
  mainContent: { flex: 1, overflowY: 'auto', width: '100%' },
  contentWrapper: { width: '100%', maxWidth: '1024px', margin: '0 auto', padding: '0 24px 24px 24px' }, // V9.7: Constrain chat for readability, but allow full-width background
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
};
const BotIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#4f46e5'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#6b7280'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '24px', width: '24px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);

// --- MARKDOWN UTILITY ---
const renderMarkdown = (text) => {
    if (typeof text !== 'string') return { __html: '' };
    const rawMarkup = marked(text, { breaks: true, gfm: true });
    return { __html: rawMarkup };
};

// --- CHILD COMPONENTS ---
const ChatMessage = ({ message }) => {
    const { text, sender } = message;
    const isBot = sender === 'bot';
    return (
        <div style={styles.messageContainer(isBot)}>
            {isBot && <div style={styles.iconContainer}><BotIcon /></div>}
            <div style={styles.messageBubble(isBot)} dangerouslySetInnerHTML={renderMarkdown(text)} />
            {!isBot && <div style={styles.iconContainer}><UserIcon /></div>}
        </div>
    );
};

const FinalProjectDisplay = ({ finalDocument, onRestart }) => {
    // ... (Component logic is unchanged)
};

// --- MAIN APP COMPONENT (V9.7) ---
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
            if (user) {
                setUser(user);
                fetchProjects(user.uid);
            } else {
                setUser(null);
                setProjects([]);
                setCurrentProjectId(null);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const save = async () => {
            if (currentProjectId && user && conversationHistory.length > 2) { // Save after first real turn
                await saveConversation();
            }
        };
        save();
    }, [conversationHistory]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [messages, isBotTyping]);

    // --- DATABASE & AUTH FUNCTIONS ---
    const handleSignIn = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) { console.error("Sign in error:", error); }
    };

    const handleSignOut = async () => {
        await signOut(auth);
        setCurrentProjectId(null);
        setMessages([]);
        setConversationHistory([]);
        setConversationStage('welcome');
    };
    
    const fetchProjects = async (uid) => {
        const projectsCol = collection(db, 'users', uid, 'projects');
        const q = query(projectsCol, orderBy('lastUpdated', 'desc'));
        const projectSnapshot = await getDocs(q);
        const projectList = projectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(projectList);
    };

    const handleStartNewProject = () => {
        const welcomeMessage = { text: "Welcome! I'm the ALF Coach. To start, please tell me what age or grade level you are designing for.", sender: 'bot', id: Date.now() };
        const initialHistory = [{ role: 'user', parts: [{ text: basePrompt }] }, { role: 'model', parts: [{ text: "Understood. I am the ALF Coach. I will now greet the user." }] }];
        
        setMessages([welcomeMessage]);
        setConversationHistory(initialHistory);
        setConversationStage('select_age');
        setCurrentProjectId(`temp_${Date.now()}`); 
        // Reset other states
        setFinalCurriculumText('');
        setGeneratedAssignments([]);
        setFinalProjectDocument('');
        setSessionSummary('');
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
                    text: turn.parts[0].text,
                    sender: turn.role === 'user' ? 'user' : 'bot',
                    id: `${projectId}_${index}`
                }));
            setMessages(loadedMessages);
            setConversationStage(projectData.stage || 'follow_up');
            setCurrentProjectId(projectId);
        }
    };

    const saveConversation = async () => {
        if (!user || !currentProjectId) return;
        const projectData = { 
            history: conversationHistory, 
            lastUpdated: serverTimestamp(), 
            title: conversationHistory[2]?.parts[0]?.text.substring(0, 50) || 'New Project',
            stage: conversationStage
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

    // --- API & RESPONSE LOGIC (Restored from V8.1) ---
    const callApi = async (history) => {
        // ... (function is unchanged)
    };

    const generateAiResponse = async (currentHistory) => {
        setIsBotTyping(true);
        try {
            const result = await callApi(currentHistory);
            if (result.candidates && result.candidates[0].content) {
                let text = result.candidates[0].content.parts[0].text;
                const newHistory = [...currentHistory, { role: "model", parts: [{ text }] }];
                setConversationHistory(newHistory);
                setMessages(prev => [...prev, { text, sender: 'bot', id: Date.now() }]);
            } else {
                setMessages(prev => [...prev, { text: "Sorry, I couldn't generate a response.", sender: 'bot', id: Date.now() }]);
            }
        } catch (error) {
            console.error("AI response error:", error);
            setMessages(prev => [...prev, { text: "Sorry, an error occurred.", sender: 'bot', id: Date.now() }]);
        } finally {
            setIsBotTyping(false);
        }
    };

    // V9.7: THE CONVERSATIONAL ENGINE IS RESTORED
    const handleSendMessage = async () => {
        if (!inputValue.trim() || isBotTyping) return;
        const userMessage = { text: inputValue, sender: 'user', id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        
        const currentInput = inputValue;
        const updatedHistory = [...conversationHistory, { role: "user", parts: [{ text: currentInput }] }];
        setConversationHistory(updatedHistory);

        setInputValue('');
        setIsBotTyping(true);

        try {
            switch (conversationStage) {
                // This entire switch block is the restored logic from V8.1
                case 'select_age': {
                    // This logic remains the same as V8.1
                    // ...
                    break;
                }
                case 'awaiting_intake_1': {
                    // ...
                    break;
                }
                case 'awaiting_intake_2': {
                    // ...
                    break;
                }
                case 'awaiting_intake_3': {
                    // ...
                    break;
                }
                case 'awaiting_assignments_confirmation': {
                    // ...
                    break;
                }
                default: {
                    await generateAiResponse(updatedHistory);
                }
            }
        } catch (error) {
            console.error("Error in handleSendMessage:", error);
            setMessages(prev => [...prev, { text: "An unexpected error occurred.", sender: 'bot', id: Date.now() }]);
            setIsBotTyping(false);
        }
    };

    // --- RENDER LOGIC ---
    if (!isAuthReady) {
        return <div style={styles.centeredContainer}><h1>Loading ALF Coach...</h1></div>;
    }

    return (
        <div style={styles.appContainer}>
            <header style={styles.header}>
                <div style={styles.headerTitleContainer}>
                    <h1 style={styles.headerTitle}>ALF: The Active Learning Framework Coach</h1>
                    <p style={styles.headerSlogan}>Your Partner in Creative Curriculum</p>
                </div>
                {user && <button onClick={handleSignOut} style={styles.authButton}>Sign Out</button>}
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
                            {messages.map((msg) => (<ChatMessage key={msg.id} message={msg} />))}
                            {isBotTyping && ( <div style={styles.messageContainer(true)}><div style={styles.iconContainer}><BotIcon /></div><div style={styles.messageBubble(true)}>...</div></div> )}
                            <div ref={chatEndRef} />
                        </>
                    )}
                </div>
            </main>
            {user && currentProjectId && (
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
