import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

// --- V7.3 PROMPT IMPORTS ---
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


// --- STYLING & ICONS (No Changes) ---
const styles = {
  appContainer: { fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column', height: '100vh' },
  header: { backgroundColor: 'white', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 },
  headerTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' },
  restartButton: { backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: '1px solid #4f46e5', cursor: 'pointer', transition: 'background-color 0.2s' },
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

// --- CHILD COMPONENT ---
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


// --- MAIN APP COMPONENT (V7.3 REWRITE) ---
export default function App() {
    // --- STATE MANAGEMENT ---
    const [messages, setMessages] = useState([]);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [conversationStage, setConversationStage] = useState('welcome');
    const [ageGroup, setAgeGroup] = useState('');
    const [ageGroupPrompt, setAgeGroupPrompt] = useState('');
    const [intakeAnswers, setIntakeAnswers] = useState({});
    const [finalCurriculumText, setFinalCurriculumText] = useState('');

    const chatEndRef = useRef(null);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // --- EFFECTS ---
    useEffect(() => {
        setMessages([{
            text: "Welcome! I'm the ALF Coach, your creative partner in designing transformative learning experiences. To start, please tell me what age or grade level you are designing for (e.g., '7 year olds', 'high school', or 'university').",
            sender: 'bot',
            id: Date.now()
        }]);
        setConversationStage('select_age');
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isBotTyping]);

    // --- API & RESPONSE LOGIC ---
    const callApi = async (history) => {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: history })
        });
        if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
        return await response.json();
    };

    const getAgeGroupFromAI = async (userInput) => {
        const sorterPrompt = `You are an input sorter. Your job is to categorize the user's input into one of five specific categories: 'Early Primary', 'Primary', 'Middle School', 'High School', or 'University'. The user's input is: '${userInput}'. Respond with ONLY the category name and nothing else.`;
        const result = await callApi([{ role: "user", parts: [{ text: sorterPrompt }] }]);
        if (result.candidates && result.candidates.length > 0) {
            const category = result.candidates[0].content.parts[0].text.trim();
            const validCategories = ['Early Primary', 'Primary', 'Middle School', 'High School', 'University'];
            if (validCategories.includes(category)) return category;
        }
        return null;
    };
    
    const runIntakeSafetyCheck = async (userInput) => {
        const checkPrompt = intakeSafetyCheckPrompt.replace("[USER'S RESPONSE]", userInput);
        const result = await callApi([{ role: "user", parts: [{ text: checkPrompt }] }]);
        return result.candidates?.[0]?.content.parts[0].text.trim().replace(/[.,]/g, '') || "SAFE";
    };

    const runMainSafetyCheck = async (catalystText) => {
        const checkPrompt = safetyCheckPrompt.replace('[CATALYST SUMMARY]', catalystText);
        const result = await callApi([{ role: "user", parts: [{ text: checkPrompt }] }]);
        return result.candidates?.[0]?.content.parts[0].text.trim() || "Error";
    };

    const generateAiResponse = async (currentHistory) => {
        setIsBotTyping(true);
        try {
            const result = await callApi(currentHistory);
            if (result.candidates && result.candidates[0].content) {
                let text = result.candidates[0].content.parts[0].text;
                const newHistory = [...currentHistory, { role: "model", parts: [{ text }] }];
                setConversationHistory(newHistory);
                
                const CATALYST_SIGNAL = "<<<CATALYST_DEFINED>>>";
                const COMPLETION_SIGNAL = "<<<CURRICULUM_COMPLETE>>>";

                if (text.includes(CATALYST_SIGNAL)) {
                    const summary = text.replace(CATALYST_SIGNAL, "").trim();
                    const safetyResult = await runMainSafetyCheck(summary);
                    if (safetyResult === "PROCEED") {
                        const transitionMessage = newHistory[newHistory.length - 1].parts[0].text.replace(CATALYST_SIGNAL, "").trim();
                        setMessages(prev => [...prev, { text: transitionMessage, sender: 'bot', id: Date.now() }]);
                        setConversationStage('issues_planning');
                    } else {
                        setMessages(prev => [...prev, { text: safetyResult, sender: 'bot', id: Date.now() }]);
                        setConversationStage('catalyst_planning');
                    }
                } else if (text.includes(COMPLETION_SIGNAL)) {
                    const curriculumText = text.replace(COMPLETION_SIGNAL, "").trim();
                    setFinalCurriculumText(curriculumText);
                    
                    const curriculumMessage = { text: curriculumText, sender: 'bot', id: Date.now() };
                    const assignmentOffer = { text: "We now have a strong foundation for our curriculum. Shall we now proceed to build out the detailed, scaffolded assignments for the students?", sender: 'bot', id: Date.now() + 1 };
                    
                    setMessages(prev => [...prev, curriculumMessage, assignmentOffer]);
                    setConversationStage('awaiting_assignments_confirmation');
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
    
    // --- `handleSendMessage` LOGIC HUB (V7.3 REWRITE) ---
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
                case 'select_age': {
                    const category = await getAgeGroupFromAI(currentInput);
                    if (category) {
                        setAgeGroup(category);
                        let selectedPrompt = '';
                        if (category === 'Early Primary') selectedPrompt = earlyPrimaryPrompt;
                        else if (category === 'Primary') selectedPrompt = primaryPrompt;
                        else if (category === 'Middle School') selectedPrompt = middleSchoolPrompt;
                        else if (category === 'High School') selectedPrompt = highSchoolPrompt;
                        else if (category === 'University') selectedPrompt = universityPrompt;
                        setAgeGroupPrompt(selectedPrompt);
                        
                        const systemPrompt = `${intakePrompt}\nAsk Intake Question 1.`;
                        await generateAiResponse([{ role: "user", parts: [{ text: systemPrompt }] }]);
                        setConversationStage('awaiting_intake_1');
                    } else {
                        setMessages(prev => [...prev, { text: "I'm sorry, I couldn't determine the age group. Could you please try again?", sender: 'bot', id: Date.now() + 1 }]);
                        setIsBotTyping(false);
                    }
                    break;
                }
                case 'awaiting_intake_1': {
                    setIntakeAnswers({ experience: currentInput });
                    const systemPrompt = `${intakePrompt}\nThe user has responded to Question 1. Their experience level is: '${currentInput}'. Now, follow your protocol to provide the correct pedagogical onboarding (Path A or B) and ask Question 2.`;
                    await generateAiResponse(updatedHistory);
                    setConversationStage('awaiting_intake_2');
                    break;
                }
                case 'awaiting_intake_2': {
                    const sentiment = await runIntakeSafetyCheck(currentInput);
                    if (sentiment === 'UNSAFE') {
                        setMessages(prev => [...prev, { text: "I cannot proceed with that topic as it violates safety guidelines. Please choose a different theme.", sender: 'bot', id: Date.now() + 1 }]);
                        setConversationStage('awaiting_intake_2');
                        setIsBotTyping(false);
                        return;
                    }
                    
                    setIntakeAnswers(prev => ({ ...prev, idea: currentInput }));
                    
                    let systemInstruction = intakePrompt;
                    if (sentiment === 'QUESTIONABLE') {
                        systemInstruction = `# SPECIAL INSTRUCTION: The user has proposed a sensitive topic. Adopt a neutral, probing tone as you ask the next question. Do not use positive affirmations.\n\n${intakePrompt}`;
                    }
                    
                    const systemPrompt = `${systemInstruction}\nThe user has responded to Question 2. Their idea is: '${currentInput}'. Follow your protocol and ask Question 3.`;
                    // V7.3 HOTFIX: Pass only the specific prompt, not the whole history, to prevent the AI from seeing its own safety check response.
                    await generateAiResponse([{ role: "user", parts: [{ text: systemPrompt }] }]);
                    setConversationStage('awaiting_intake_3');
                    break;
                }
                case 'awaiting_intake_3': {
                    const finalIntakeAnswers = { ...intakeAnswers, constraints: currentInput };
                    const finalSystemPrompt = `${basePrompt}\n${ageGroupPrompt}\n# USER CONTEXT FROM INTAKE:\n- User's experience with PBL: ${finalIntakeAnswers.experience}\n- User's starting idea: ${finalIntakeAnswers.idea}\n- User's project constraints: ${finalIntakeAnswers.constraints}`;
                    const kickoffMessage = "Excellent, this is all incredibly helpful context. Let's get started.";
                    
                    setMessages(prev => [...prev, { text: kickoffMessage, sender: 'bot', id: Date.now() + 1 }]);
                    
                    const initialHistory = [{ role: "user", parts: [{ text: finalSystemPrompt }] }, { role: "model", parts: [{ text: kickoffMessage }] }];
                    setConversationHistory(initialHistory);
                    
                    await generateAiResponse(initialHistory);
                    setConversationStage('catalyst_planning');
                    break;
                }
                case 'awaiting_assignments_confirmation': {
                    if (currentInput.toLowerCase().includes('yes')) {
                        setConversationStage('designing_assignments_intro');
                        // V7.3 HOTFIX: Pass the age group explicitly to the prompt context.
                        const systemPrompt = `${assignmentGeneratorPrompt}\n\nHere is the curriculum we designed:\n\n${finalCurriculumText}\n\nNow, begin the assignment design workflow. Start with Step 1: Propose the Scaffolding Strategy for the ${ageGroup} age group.`;
                        await generateAiResponse([{ role: "user", parts: [{ text: systemPrompt }] }]);
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
                    await generateAiResponse(updatedHistory);
                    break;
                }
                default: {
                    await generateAiResponse(updatedHistory);
                }
            }
        } catch (error) {
            console.error("Error in handleSendMessage:", error);
            setMessages(prev => [...prev, { text: "An unexpected error occurred. Please try again.", sender: 'bot', id: Date.now() }]);
            setIsBotTyping(false);
        }
    };

    const handleRestart = () => window.location.reload();

    // --- RENDER ---
    return (
        <div style={styles.appContainer}>
            <header style={styles.header}>
                <h1 style={styles.headerTitle}>ALF - The Active Learning Framework Coach</h1>
                <button onClick={handleRestart} style={styles.restartButton}>Start New Plan</button>
            </header>
            <main style={styles.mainContent}>
                <div style={styles.contentWrapper}>
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
                </div>
            </main>
            <footer style={styles.footer}>
                <div style={styles.contentWrapper}>
                    <div style={styles.inputArea}>
                        <textarea value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="Type your response here..." style={styles.textarea} disabled={isBotTyping} />
                        <button onClick={handleSendMessage} disabled={!inputValue.trim() || isBotTyping} style={{...styles.sendButton, ...(isBotTyping || !inputValue.trim() ? styles.sendButtonDisabled : {})}}>
                            <SendIcon />
                        </button>
                    </div>
                </div>
            </footer>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
    );
}
