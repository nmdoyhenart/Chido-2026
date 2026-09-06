import React, {
    createContext,
    ReactNode,
    useContext,
    useState,
} from 'react';

import { AppRole, SessionMode } from '../types/roles';

type AppSessionContextType = {
    mode: SessionMode;
    role: AppRole | null;

    enterSimulation: (role: AppRole) => void;
    enterGuest: () => void;
    clearSession: () => void;
};

const AppSessionContext = createContext<AppSessionContextType | undefined>(
    undefined
);

export function AppSessionProvider({
    children,
    }: {
    children: ReactNode;
    }) {
    const [mode, setMode] = useState<SessionMode>('guest');
    const [role, setRole] = useState<AppRole | null>(null);

    const enterSimulation = (selectedRole: AppRole) => {
        setMode('simulation');
        setRole(selectedRole);
    };

    const enterGuest = () => {
        setMode('guest');
        setRole('cliente anónimo');
    };

    const clearSession = () => {
        setMode('guest');
        setRole(null);
    };

    return (
        <AppSessionContext.Provider
        value={{
            mode,
            role,
            enterSimulation,
            enterGuest,
            clearSession,
        }}
        >
        {children}
        </AppSessionContext.Provider>
    );
}

export function useAppSession() {
    const context = useContext(AppSessionContext);

    if (!context) {
        throw new Error(
        'la función useAppSession debe ser utilizada dentro de un AppSessionProvider'
        );
    }

    return context;
}
