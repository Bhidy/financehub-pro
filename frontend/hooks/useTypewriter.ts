
import { useState, useEffect } from 'react';

/**
 * A hook that simulates typing effect for an array of placeholders.
 * 
 * @param texts Array of strings to cycle through
 * @param typingSpeed Speed of typing in ms (default 50-100 random)
 * @param deletingSpeed Speed of deleting in ms (default 30-50 random)
 * @param pauseDuration Pause before deleting/next text in ms (default 2000)
 */
export function useTypewriter(
    texts: string[],
    typingSpeed = 80,
    deletingSpeed = 40,
    pauseDuration = 2000
) {
    // Current text being displayed
    const [text, setText] = useState('');
    // Current phase: 'typing' | 'deleting' | 'pausing'
    const [phase, setPhase] = useState<'typing' | 'deleting' | 'pausing'>('typing');
    // Current index in the texts array
    const [index, setIndex] = useState(0);

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const currentFullText = texts[index];

        if (phase === 'typing') {
            if (text.length < currentFullText.length) {
                // Determine random typing delay for realism
                const randomDelay = typingSpeed + (Math.random() * 50 - 25);
                timeout = setTimeout(() => {
                    setText(currentFullText.slice(0, text.length + 1));
                }, randomDelay);
            } else {
                // Finished typing, pause
                setPhase('pausing');
            }
        } else if (phase === 'pausing') {
            timeout = setTimeout(() => {
                setPhase('deleting');
            }, pauseDuration);
        } else if (phase === 'deleting') {
            if (text.length > 0) {
                const randomDelay = deletingSpeed + (Math.random() * 20 - 10);
                timeout = setTimeout(() => {
                    setText(currentFullText.slice(0, text.length - 1));
                }, randomDelay);
            } else {
                // Finished deleting, move to next text
                setPhase('typing');
                setIndex((prevIndex) => (prevIndex + 1) % texts.length);
            }
        }

        return () => clearTimeout(timeout);
    }, [text, phase, index, texts, typingSpeed, deletingSpeed, pauseDuration]);

    return text;
}
