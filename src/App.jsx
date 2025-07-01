import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked'; // For improved Markdown rendering

// --- PROMPT IMPORTS (The AI's "Brain") ---
// Assumes you have created these files in a `src/prompts/` directory
import { basePrompt } from './prompts/base_prompt.js';
import { intakePrompt } from './prompts/intake_prompt.js';
import { earlyPrimaryPrompt } from './prompts/early_primary_prompt.js';
import { primaryPrompt } from './prompts/primary_prompt.js';
import { middleSchoolPrompt } from './prompts/middle_school_prompt.js';
import { highSchoolPrompt } from './prompts/high_school_prompt.js';
// Studio prompts can be added here if you want to use them in the initial brainstorming
// import { studioFoodscapesPrompt } from './prompts/studio_foodscapes_prompt.js';


// --- STYLING OBJECT ---
// No changes to styling from the original version
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


// --- SVG ICONS ---
// No changes to icons from the original version
const BotIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#4f46e5'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '32px', width: '32px', color: '#6b7280'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>);
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" style={{height: '24px', width: '24px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);


// --- CHILD COMPONENTS ---

// ChatMessage Component (Now uses `marked` for rendering)
const ChatMessage = ({ message }) => {
    const { text, sender } = message;
    const isBot = sender === 'bot';

    // Use `marked` to safely parse Markdown into HTML
    const renderMarkdown = (text) => {
        const rawMarkup = marked(text, { breaks: true, gfm: true });
        return { __html: rawMarkup };
    };

    return (
        <div style={styles.messageContainer(isBot)}>
            {isBot && <div style={styles.iconContainer}><BotIcon /></div>}
            <div style={styles.messageBubble(isBot)} dangerouslySetInnerHTML={renderMarkdown(text)} />
            {!isBot && <div style={styles.iconContainer}><UserIcon /></div>}
        </div>
    );
};

// SummaryDisplay Component (Now has a "Copy to Clipboard" button)
const SummaryDisplay = ({ curriculumText, onRestart, onAskFollowUp }) => {
    const [copySuccess, setCopySuccess] = useState('');

    const renderMarkdown = (text) => {
        const rawMarkup = marked(text, { breaks: true, gfm: true });
        return { __html: rawMarkup };
    };
    
    // Simple copy to clipboard function
    const handleCopy = () => {
        const textarea = document.createElement('textarea');
        textarea.value = curriculumText;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000); // Reset message after 2s
        } catch (err) {
            setCopySuccess('Failed to copy');
        }
        document.body.removeChild(textarea);
    };

    return (
        <div style={styles.summaryContainer}>
            <div dangerouslySetInnerHTML={renderMarkdown(curriculumText)} />
            <div style={styles.summaryActions}>
                <button onClick={handleCopy} style={styles.copyButton}>
                    {copySuccess || 'Copy to Clipboard'}
                </button>
                <button onClick={onAskFollowUp} style={styles.actionButton}>Ask Follow-up</button>
                <button onClick={onRestart} style={styles.actionButton}>Start New Plan</button>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
    // --- STATE MANAGEMENT ---
    const [messages, setMessages] = useState([]);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [finalCurriculum, setFinalCurriculum] = useState('');
    
    // NEW state to manage the conversation flow
    const [conversationStage, setConversationStage] = useState('welcome'); // welcome -> intake -> chatting -> finished
    const [systemPrompt, setSystemPrompt] = useState(''); // To hold the fully constructed prompt

    const chatEndRef = useRef(null);

    // --- EFFECTS ---

    // Effect to start the conversation
    useEffect(() => {
        setMessages([{
            text: "Welcome! I'm the ALF Coach, your creative partner in designing transformative learning experiences. To start, please tell me what age or grade level you are designing for (e.g., 'high school', 'primary', 'grades K-2').",
            sender: 'bot',
            id: Date.now()
        }]);
        setConversationStage('select_age');
    }, []);

    // Effect to scroll to the latest message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isBotTyping]);

    // --- API CALL ---
    const generateAiResponse = async (history) => {
        setIsBotTyping(true);
        // IMPORTANT: Replace with your actual API key retrieval method (e.g., from environment variables)
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: history })
            });
            if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
            
            const result = await response.json();
            
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
                let text = result.candidates[0].content.parts[0].text;
                const newHistory = [...history, { role: "model", parts: [{ text }] }];
                setConversationHistory(newHistory);

                const COMPLETION_SIGNAL = "<<<CURRICULUM_COMPLETE>>>";
                if (text.includes(COMPLETION_SIGNAL)) {
                    const curriculumText = text.replace(COMPLETION_SIGNAL, "").trim();
                    setFinalCurriculum(curriculumText);
                    setConversationStage('finished');
                } else {
                    setMessages(prev => [...prev, { text, sender: 'bot', id: Date.now() }]);
                }
            } else {
                let errorMessage = "Sorry, I couldn't generate a response.";
                if (result.candidates?.[0]?.finishReason === "SAFETY") {
                    errorMessage = "The response was blocked for safety reasons. Please rephrase your input.";
                }
                setMessages(prev => [...prev, { text: errorMessage, sender: 'bot', id: Date.now() }]);
            }
        } catch (error) {
            console.error("Error generating AI response:", error);
            setMessages(prev => [...prev, { text: "Sorry, I encountered an error connecting to the AI. Please ensure your API key is set up correctly.", sender: 'bot', id: Date.now() }]);
        } finally {
            setIsBotTyping(false);
        }
    };

    // --- HANDLERS ---

    const handleSendMessage = () => {
        if (!inputValue.trim() || isBotTyping) return;

        const userMessage = { text: inputValue, sender: 'user', id: Date.now() };
        setMessages(prev => [...prev, userMessage]);

        // --- NEW DYNAMIC PROMPT LOGIC ---
        if (conversationStage === 'select_age') {
            let selectedAgePrompt = '';
            const lowerCaseInput = inputValue.toLowerCase();

            if (lowerCaseInput.includes('high')) selectedAgePrompt = highSchoolPrompt;
            else if (lowerCaseInput.includes('middle')) selectedAgePrompt = middleSchoolPrompt;
            else if (lowerCaseInput.includes('primary') || lowerCaseInput.includes('3-5')) selectedAgePrompt = primaryPrompt;
            else if (lowerCaseInput.includes('early') || lowerCaseInput.includes('k-2')) selectedAgePrompt = earlyPrimaryPrompt;
            
            if (selectedAgePrompt) {
                // Assemble the system prompt for the first time
                const finalSystemPrompt = `${basePrompt}\n${selectedAgePrompt}\n${intakePrompt}`;
                setSystemPrompt(finalSystemPrompt); // Save the full prompt
                
                const initialHistory = [{ role: "user", parts: [{ text: finalSystemPrompt }] }];
                const updatedHistory = [...initialHistory, { role: "user", parts: [{ text: inputValue }] }];
                
                setConversationHistory(updatedHistory);
                setConversationStage('chatting'); // Transition to the main chat
                generateAiResponse(updatedHistory);
            } else {
                const errorMessage = { text: "I'm sorry, I didn't recognize that age group. Please try something like 'high school', 'middle school', 'primary', or 'K-2'.", sender: 'bot', id: Date.now() + 1 };
                setMessages(prev => [...prev, errorMessage]);
            }
        } else { // Handles 'chatting' and 'finished_followup' stages
            const updatedHistory = [...conversationHistory, { role: "user", parts: [{ text: inputValue }] }];
            setConversationHistory(updatedHistory);
            generateAiResponse(updatedHistory);
        }
        
        setInputValue('');
    };

    const handleRestart = () => {
        // A full reload is the simplest way to reset everything
        window.location.reload();
    };

    const handleAskFollowUp = () => {
        // Keep the final curriculum visible but re-enable the chat
        setConversationStage('chatting'); 
        const followUpMessage = {
            text: "Of course! What would you like to refine or discuss further about this curriculum?",
            sender: 'bot',
            id: Date.now()
        };
        setMessages(prev => [...prev, followUpMessage]);
    };

    // --- RENDER ---
    return (
        <div style={styles.appContainer}>
            <header style={styles.header}>
                <h1 style={styles.headerTitle}>ALF - The Active Learning Framework Coach</h1>
            </header>
            
            <main style={styles.mainContent}>
                <div style={styles.contentWrapper}>
                    {conversationStage === 'finished' ? (
                        <SummaryDisplay 
                            curriculumText={finalCurriculum} 
                            onRestart={handleRestart}
                            onAskFollowUp={handleAskFollowUp}
                        />
                    ) : (
                        <>
                            {messages.map((msg, index) => (
                                <ChatMessage key={msg.id || index} message={msg} />
                            ))}
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
                            <textarea
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                placeholder="Type your response here..."
                                style={styles.textarea}
                                disabled={isBotTyping || conversationStage === 'welcome'}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isBotTyping || conversationStage === 'welcome'}
                                style={{...styles.sendButton, ...(isBotTyping || !inputValue.trim() || conversationStage === 'welcome' ? styles.sendButtonDisabled : {})}}
                            >
                                <SendIcon />
                            </button>
                        </div>
                    </div>
                </footer>
            )}
            
            <style>
                {`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
                `}
            </style>
        </div>
    );
}
