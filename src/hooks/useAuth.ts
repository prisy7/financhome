import { useState, useCallback } from 'react';
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { showToast } from '../utils';

export function useAuth() {
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const login = useCallback(async () => {
        setIsLoggingIn(true);
        
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (e: any) {
            console.error("Erro detalhado no login:", e);
            let msg = e.message;
            
            if (e.code === 'auth/popup-blocked') {
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    // Fallback for mobile devices
                    const provider = new GoogleAuthProvider();
                    signInWithRedirect(auth, provider);
                    return;
                }
                msg = 'Popups bloqueados! Por favor, libere os popups em seu navegador para entrar.';
            } else if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    // Fallback for mobile devices that immediately close popups
                    const provider = new GoogleAuthProvider();
                    signInWithRedirect(auth, provider);
                    return;
                }
                msg = 'A janela de login foi fechada. Tente novamente.';
            } else if (e.code === 'auth/unauthorized-domain') {
                msg = 'Domínio não autorizado no Firebase. Verifique as configurações.';
            }
            
            showToast(`Erro (${e.code}): ${msg}`, 'error');
        } finally {
            setIsLoggingIn(false);
        }
    }, []);

    const logout = useCallback(async () => {
        await signOut(auth);
    }, []);

    return { login, logout, isLoggingIn };
}
