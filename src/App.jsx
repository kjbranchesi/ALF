import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

// --- V4 PROMPT IMPORTS ---
// All prompts, including the new V4 files, are imported.
import { basePrompt } from './prompts/base_prompt.js';
import { intakePrompt } from './prompts/intake_prompt.js';
import { safetyCheckPrompt } from './prompts/safety_check_prompt.js';
import { assignmentGeneratorPrompt } from './prompts/assignment_generator_prompt.js';
import { earlyPrimaryPrompt } from './prompts/early_primary_prompt.js';
import { primaryPrompt } from './prompts/primary_prompt.js';
import { middleSchoolPrompt } from './prompts/middle_school_prompt.js';
import { highSchoolPrompt } from './prompts/high_school_prompt.js';

// --- STYLING & ICONS (No Changes) ---
const styles = {
  appContainer: { fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column', height: '100vh' },
  header: { backgroundColor: 'white', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 },
  headerTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' },
  mainContent: { flex: 1, overflowY: 'auto', padding: '24px' },
  contentWrapper: { maxWidth: '896px', margin: '0 auto' },
  footer: { backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: '16px' },
  inputArea: { display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '8px' },
  textarea: { width: '100%', backgroundColor: 'transparent', padding: '8px', color: '#1f2937', border: 'none', outline: 'none', resize: 'none', fontSize: '1rem' },
  sendButton: { padding: '12px', borderRadius: '50%', backgroundColor: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' },
  sendButtonDisabled: { backgroundColor: '#9ca3af', cursor: 'not-allowed' },
  messageContainer: (isBot) => ({ display: 'flex', alignItems: 'flex-start', gap: '12px', margin: '16px 0', justifyContent: isBot ? 'flex-start' : 'flex-end' }),
  iconContainer: { flexShrink: 0, backgroundColor: '#e5e7eb', borderRadius: '50%', padding: '8px' },
  messageBubble: (isBot) => ({ maxWidth: '80%', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: isBot ? '#eef2ff' : 'white', color: '#1f2937', wordWrap: 'break-word', borderTopLeftRadius: isBot ? '0px' : '12px', borderTopRightRadius: isBot ? '12px' : '0px', lineHeight: 1.7 }),
  summaryContainer: { backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  summaryActions: { marginTop: '24px', display: 'flex', gap: '12px' },
  actionButton: { flex: 1, backgroundColor: '#4f46e5', color: 'white', fontWeight: 'bold', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' },
  copyButton: { flex: 1, backgroundColor: '#6b7280', color: 'white', fontWeight: 'bold', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' },
};
const BotIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#4f46e5'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#6b7280'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '24px', width: '24px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);

// --- CHILD COMPONENTS (No Changes) ---
const ChatMessage = ({ message }) => {
    const { text, sender } = message;
    const isBot = sender === 'bot';
    const renderMarkdown = (text) => ({ __html: marked(text, { breaks: true, gfm: true }) });
    return (
        <div style={styles.messageContainer(isBot)}>
            {isBot && <div style={styles.iconContainer}><BotIcon /></div>}
            <div style={styles.messageBubble(isBot)} dangerouslySetInnerHTML={renderMarkdown(text)} />
            {!isBot && <div style={styles.iconContainer}><UserIcon /></div>}
        </div>
    );
};
const SummaryDisplay = ({ curriculumText, onRestart, onAskFollowUp }) => {
    const [copySuccess, setCopySuccess] = useState('');
    const renderMarkdown = (text) => ({ __html: marked(text, { breaks: true, gfm: true }) });
    const handleCopy = () => {
        const textarea = document.createElement('textarea');
        textarea.value = curriculumText;
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
            <div dangerouslySetInnerHTML={renderMarkdown(curriculumText)} />
            <div style={styles.summaryActions}>
                <button onClick={handleCopy} style={styles.copyButton}>{copySuccess || 'Copy to Clipboard'}</button>
                <button onClick={onAskFollowUp} style={styles.actionButton}>Ask Follow-up</button>
                <button onClick={onRestart} style={styles.actionButton}>Start New Plan</button>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT (V4 REWRITE) ---
export default function App() {
    // --- V4 STATE MANAGEMENT ---
    const [messages, setMessages] = useState([]);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [finalCurriculum, setFinalCurriculum] = useState('');
    
    // **NEW** More granular state machine for the entire V4 conversation flow.
    const [conversationStage, setConversationStage] = useState('welcome');
    const [ageGroupPrompt, setAgeGroupPrompt] = useState('');
    const [intakeAnswers, setIntakeAnswers] = useState({});
    // **NEW** State to hold the defined Catalyst for the safety check.
    const [catalystSummary, setCatalystSummary] = useState('');

    const chatEndRef = useRef(null);

    // --- EFFECTS ---
    useEffect(() => {
        setMessages([{
            text: "Welcome! I'm the ALF Coach, your creative partner in designing transformative learning experiences. To start, please tell me what age or grade level you are designing for (e.g., '7 year olds', 'high school', or 'grades 3-5').",
            sender: 'bot',
            id: Date.now()
        }]);
        setConversationStage('select_age');
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isBotTyping]);

    // --- API CALLS ---
    const getAgeGroupFromAI = async (userInput) => {
        setIsBotTyping(true);
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const sorterPrompt = `You are an input sorter. Your job is to categorize the user's input into one of four specific categories: 'Early Primary', 'Primary', 'Middle School', or 'High School'. The user's input is: '${userInput}'. Respond with ONLY the category name and nothing else.`;
        const history = [{ role: "user", parts: [{ text: sorterPrompt }] }];
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: history }) });
            if (!response.ok) return null;
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0) {
                const category = result.candidates[0].content.parts[0].text.trim();
                const validCategories = ['Early Primary', 'Primary', 'Middle School', 'High School'];
                if (validCategories.includes(category)) return category;
            }
            return null;
        } catch (error) {
            console.error("Error in age group sorter:", error);
            return null;
        } finally {
            setIsBotTyping(false);
        }
    };
    
    // **NEW** API call specifically for the safety check.
    const runSafetyCheck = async (catalystText) => {
        setIsBotTyping(true);
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const checkPrompt = safetyCheckPrompt.replace('[CATALYST SUMMARY]', catalystText);
        const history = [{ role: "user", parts: [{ text: checkPrompt }] }];
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: history }) });
            if (!response.ok) return "Error";
            const result = await response.json();
            return result.candidates[0].content.parts[0].text.trim();
        } catch (error) {
            console.error("Error in safety check:", error);
            return "Error";
        } finally {
            setIsBotTyping(false);
        }
    };

    const generateAiResponse = async (history, isAssignment = false) => {
        setIsBotTyping(true);
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        let currentHistory = [...history];
        if (isAssignment) {
            // If generating assignments, prepend the specific prompt.
            currentHistory.unshift({ role: "user", parts: [{ text: assignmentGeneratorPrompt }] });
        }

        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: currentHistory }) });
            if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
            const result = await response.json();
            if (result.candidates && result.candidates[0].content) {
                let text = result.candidates[0].content.parts[0].text;
                const newHistory = [...history, { role: "model", parts: [{ text }] }];
                setConversationHistory(newHistory);
                
                // **NEW** Logic to handle different signals from the AI.
                const CATALYST_SIGNAL = "<<<CATALYST_DEFINED>>>";
                const COMPLETION_SIGNAL = "<<<CURRICULUM_COMPLETE>>>";

                if (text.includes(CATALYST_SIGNAL)) {
                    const summary = text.replace(CATALYST_SIGNAL, "").trim();
                    setCatalystSummary(summary); // Save the catalyst
                    const safetyResult = await runSafetyCheck(summary);
                    if (safetyResult === "PROCEED") {
                        const transitionMessage = newHistory[newHistory.length - 1].parts[0].text.replace(CATALYST_SIGNAL, "").trim();
                        setMessages(prev => [...prev, { text: transitionMessage, sender: 'bot', id: Date.now() }]);
                        setConversationStage('issues_planning');
                    } else {
                        setMessages(prev => [...prev, { text: safetyResult, sender: 'bot', id: Date.now() }]);
                        // Stay in catalyst planning stage to redefine
                    }
                } else if (text.includes(COMPLETION_SIGNAL)) {
                    const curriculumText = text.replace(COMPLETION_SIGNAL, "").trim();
                    setFinalCurriculum(curriculumText);
                    setConversationStage('finished');
                } else {
                    setMessages(prev => [...prev, { text, sender: 'bot', id: Date.now() }]);
                }
            } else {
                let errorMessage = "Sorry, I couldn't generate a response.";
                if (result.candidates?.[0]?.finishReason === "SAFETY") errorMessage = "The response was blocked for safety reasons. Please rephrase your input.";
                setMessages(prev => [...prev, { text: errorMessage, sender: 'bot', id: Date.now() }]);
            }
        } catch (error) {
            console.error("Error generating AI response:", error);
            setMessages(prev => [...prev, { text: "Sorry, I encountered an error connecting to the AI.", sender: 'bot', id: Date.now() }]);
        } finally {
            setIsBotTyping(false);
        }
    };
    
    // --- V4 HANDLERS ---
    const handleSendMessage = async () => {
        if (!inputValue.trim() || isBotTyping) return;
        const userMessage = { text: inputValue, sender: 'user', id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputValue;
        setInputValue('');

        switch (conversationStage) {
            case 'select_age': {
                const category = await getAgeGroupFromAI(currentInput);
                if (category) {
                    let selectedPrompt = '';
                    if (category === 'Early Primary') selectedPrompt = earlyPrimaryPrompt;
                    else if (category === 'Primary') selectedPrompt = primaryPrompt;
                    else if (category === 'Middle School') selectedPrompt = middleSchoolPrompt;
                    else if (category === 'High School') selectedPrompt = highSchoolPrompt;
                    setAgeGroupPrompt(selectedPrompt);
                    setMessages(prev => [...prev, { text: "Awesome, designing for that age group is going to be great. Before we jump into the framework, it's helpful for me to understand your starting point. Are you new to Project-Based Learning, or is this a methodology you've worked with before? Either way is perfectly fine, of course!", sender: 'bot', id: Date.now() + 1 }]);
                    setConversationStage('awaiting_intake_1');
                } else {
                    setMessages(prev => [...prev, { text: "I'm sorry, I couldn't determine the age group. Could you please try again? For example: 'third grade', '15 year olds', or 'high school'.", sender: 'bot', id: Date.now() + 1 }]);
                }
                break;
            }
            case 'awaiting_intake_1': {
                setIntakeAnswers(prev => ({ ...prev, experience: currentInput }));
                setMessages(prev => [...prev, { text: "That's great to know, thank you. Now, for the fun part. Do you have a particular theme or studio topic in mind, or would you like for us to explore some possibilities together?", sender: 'bot', id: Date.now() + 1 }]);
                setConversationStage('awaiting_intake_2');
                break;
            }
            case 'awaiting_intake_2': {
                setIntakeAnswers(prev => ({ ...prev, idea: currentInput }));
                setMessages(prev => [...prev, { text: "Perfect. One last thing before we start building. Are there any practical constraints we should keep in mind, like a specific timeframe, a limited budget, or particular technologies?", sender: 'bot', id: Date.now() + 1 }]);
                setConversationStage('awaiting_intake_3');
                break;
            }
            case 'awaiting_intake_3': {
                const finalIntakeAnswers = { ...intakeAnswers, constraints: currentInput };
                const finalSystemPrompt = `${basePrompt}\n${ageGroupPrompt}\n# USER CONTEXT FROM INTAKE:\n- User's experience with PBL: ${finalIntakeAnswers.experience}\n- User's starting idea: ${finalIntakeAnswers.idea}\n- User's project constraints: ${finalIntakeAnswers.constraints}\n${intakePrompt}`;
                const kickoffMessage = `Based on your experience level of "${finalIntakeAnswers.experience}", let's begin.`;
                const initialHistory = [{ role: "user", parts: [{ text: finalSystemPrompt }] }, { role: "user", parts: [{ text: kickoffMessage }] }];
                setConversationHistory(initialHistory);
                setConversationStage('catalyst_planning');
                generateAiResponse(initialHistory);
                break;
            }
            case 'catalyst_planning':
            case 'issues_planning':
            case 'method_planning':
            case 'engagement_planning': {
                const updatedHistory = [...conversationHistory, { role: "user", parts: [{ text: currentInput }] }];
                setConversationHistory(updatedHistory);
                generateAiResponse(updatedHistory);
                break;
            }
            case 'follow_up': {
                if (currentInput.toLowerCase().includes('assignment')) {
                    generateAiResponse(conversationHistory, true); // true indicates this is an assignment generation task
                } else {
                    const updatedHistory = [...conversationHistory, { role: "user", parts: [{ text: currentInput }] }];
                    setConversationHistory(updatedHistory);
                    generateAiResponse(updatedHistory);
                }
                break;
            }
        }
    };

    const handleRestart = () => window.location.reload();
    const handleAskFollowUp = () => {
        setConversationStage('follow_up'); 
        const followUpMessage = { text: "Of course! What would you like to refine or discuss further? We can also generate a set of scaffolded assignments for this curriculum.", sender: 'bot', id: Date.now() };
        setMessages(prev => [...prev, followUpMessage]);
    };

    // --- RENDER ---
    return (
        <div style={styles.appContainer}>
            <header style={styles.header}><h1 style={styles.headerTitle}>ALF - The Active Learning Framework Coach</h1></header>
            <main style={styles.mainContent}>
                <div style={styles.contentWrapper}>
                    {conversationStage === 'finished' ? (
                        <SummaryDisplay curriculumText={finalCurriculum} onRestart={handleRestart} onAskFollowUp={handleAskFollowUp} />
                    ) : (
                        <>
                            {messages.map((msg) => (<ChatMessage key={msg.id} message={msg} />))}
                            {isBotTyping && (
                                <div style={styles.messageContainer(true)}>
                                    <div style={styles.iconContainer}><BotIcon /></div>
                                    <div style={styles.messageBubble(true)}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                            <span style={{height: '8px', width: '8px', backgroundColor: '#818cf8', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out'}}></span>
                                            <span style={{height: '8px', width: '8px', backgroundColor: '#818cf8', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out .25s'}}></span>
                                            <span style={{height: '8px', width: '8px', backgroundColor: '#818cf8', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out .5s'}}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </>
                    )}
                </div>
            </main>
            {conversationStage !== 'finished' && (
                <footer style={styles.footer}>
                    <div style={styles.contentWrapper}>
                        <div style={styles.inputArea}>
                            <textarea value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="Type your response here..." style={styles.textarea} disabled={isBotTyping || conversationStage === 'welcome'} />
                            <button onClick={handleSendMessage} disabled={!inputValue.trim() || isBotTyping || conversationStage === 'welcome'} style={{...styles.sendButton, ...(isBotTyping || !inputValue.trim() || conversationStage === 'welcome' ? styles.sendButtonDisabled : {})}}>
                                <SendIcon />
                            </button>
                        </div>
                    </div>
                </footer>
            )}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
    );
}
